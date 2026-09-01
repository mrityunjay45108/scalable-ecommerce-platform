import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShippingProviderFactory } from '../shipping/providers/shipping-provider.factory';
import {
  CreateReturnRequestDto,
  ApproveReturnDto,
  RejectReturnDto,
  QualityCheckDto,
  ProcessReplacementDto,
  ReturnQueryDto,
  WebhookReturnDto,
} from './returns.dto';
import {
  ReturnStatus,
  ReturnAction,
  QualityCheckResult,
  OrderStatus,
  Role,
} from '@ecommerce/types';
import { NotificationType } from '@ecommerce/database';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  // Return policy window in days default fallback
  private readonly defaultReturnWindowDays = 14;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
    private shippingProviderFactory: ShippingProviderFactory,
    @Optional() private configService?: ConfigService,
  ) {}

  /**
   * Sanitizes incoming bank details before database persistence:
   * Strips all forbidden financial credentials and only accepts valid bank payout fields.
   */
  public sanitizeIncomingBankDetails(bankDetails: any): any {
    if (!bankDetails || typeof bankDetails !== 'object') return null;
    const clean: Record<string, any> = {};

    if (bankDetails.accountNumber) clean.accountNumber = String(bankDetails.accountNumber).trim();
    if (bankDetails.ifscCode) clean.ifscCode = String(bankDetails.ifscCode).trim().toUpperCase();
    if (bankDetails.accountHolderName) clean.accountHolderName = String(bankDetails.accountHolderName).trim();
    if (bankDetails.upiId) clean.upiId = String(bankDetails.upiId).trim().toLowerCase();

    return Object.keys(clean).length > 0 ? clean : null;
  }

  /**
   * Helper to sanitize bank details for public/customer API responses:
   * Masks account number (all but last 4 digits), IFSC code, UPI ID, and strips forbidden credentials.
   */
  public sanitizeBankDetails(bankDetails: any): any {
    if (!bankDetails || typeof bankDetails !== 'object') return bankDetails;
    const sanitized = { ...bankDetails };

    // Strip forbidden card/CVV/password properties if present
    delete (sanitized as any).cardNumber;
    delete (sanitized as any).card;
    delete (sanitized as any).cvv;
    delete (sanitized as any).cvc;
    delete (sanitized as any).expiry;
    delete (sanitized as any).cardExpiry;
    delete (sanitized as any).password;
    delete (sanitized as any).bankingPassword;
    delete (sanitized as any).pin;

    // Mask account number (e.g. XXXXXXXXXX1234)
    if (sanitized.accountNumber) {
      const accStr = String(sanitized.accountNumber).trim();
      sanitized.accountNumber =
        accStr.length > 4
          ? 'X'.repeat(accStr.length - 4) + accStr.slice(-4)
          : 'X'.repeat(accStr.length);
    }

    // Mask IFSC code (e.g. XXXXXX123)
    if (sanitized.ifscCode) {
      const ifscStr = String(sanitized.ifscCode).trim();
      if (ifscStr.length > 4) {
        sanitized.ifscCode = 'X'.repeat(ifscStr.length - 3) + ifscStr.slice(-3);
      }
    }

    // Mask UPI ID (e.g. m***@upi)
    if (sanitized.upiId) {
      const upiStr = String(sanitized.upiId).trim();
      const atIdx = upiStr.indexOf('@');
      if (atIdx > 1) {
        sanitized.upiId = upiStr[0] + '***' + upiStr.slice(atIdx);
      } else if (atIdx === 1) {
        sanitized.upiId = upiStr[0] + '***' + upiStr.slice(atIdx);
      }
    }

    return sanitized;
  }

  /**
   * Retrieves and validates the configurable return window in days.
   */
  public getReturnWindowDays(): number {
    const configured = this.configService?.get<number>('returns.windowDays');
    if (typeof configured === 'number' && !isNaN(configured) && configured > 0) {
      return configured;
    }
    const envVal = parseInt(process.env.RETURN_WINDOW_DAYS || '14', 10);
    return !isNaN(envVal) && envVal > 0 ? envVal : this.defaultReturnWindowDays;
  }

  /**
   * Formats a return request object for safe API output.
   */
  public formatReturnRequest(returnReq: any): any {
    if (!returnReq) return returnReq;
    const formatted = { ...returnReq };
    if (formatted.bankDetails) {
      formatted.bankDetails = this.sanitizeBankDetails(formatted.bankDetails);
    }
    return formatted;
  }

  // =========================================================================
  // 1. CUSTOMER: CREATE RETURN / REPLACEMENT REQUEST
  // =========================================================================

  async createReturnRequest(userId: string, dto: CreateReturnRequestDto) {
    // 1. Verify Order ownership & status
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: {
        items: true,
        shippingAddress: true,
        shipment: true,
        returnRequests: {
          include: { items: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to you');
    }

    // 2. Validate delivered status
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Returns can only be requested for DELIVERED orders. Current order status: '${order.status}'`,
      );
    }

    // 3. Validate return policy window (configurable via ConfigService)
    const windowDays = this.getReturnWindowDays();
    const deliveryTimestamp =
      order.shipment?.deliveredAt ||
      (order.status === OrderStatus.DELIVERED ? order.updatedAt : null);

    if (deliveryTimestamp) {
      const deliveredTime = new Date(deliveryTimestamp).getTime();
      const cutoffTime = deliveredTime + windowDays * 24 * 60 * 60 * 1000;
      if (Date.now() > cutoffTime) {
        throw new BadRequestException(
          `Return window of ${windowDays} days has expired for this order`,
        );
      }
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be selected for return');
    }

    // 4. Validate items, quantities and duplicate return prevention
    for (const returnItem of dto.items) {
      const orderItem = order.items.find((i) => i.id === returnItem.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(`Order item ${returnItem.orderItemId} does not belong to this order`);
      }

      if (returnItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Return quantity (${returnItem.quantity}) exceeds purchased quantity (${orderItem.quantity}) for ${orderItem.productTitle}`,
        );
      }

      // Calculate already returned / active return quantity for this item
      let activeReturnedQty = 0;
      for (const req of order.returnRequests) {
        if (req.status !== ReturnStatus.CANCELLED && req.status !== ReturnStatus.REJECTED) {
          const matchedItem = req.items.find((ri) => ri.orderItemId === returnItem.orderItemId);
          if (matchedItem) {
            activeReturnedQty += matchedItem.quantity;
          }
        }
      }

      if (activeReturnedQty + returnItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Item '${orderItem.productTitle}' already has active return/replacement requests for ${activeReturnedQty} unit(s). Remaining eligible: ${orderItem.quantity - activeReturnedQty}`,
        );
      }
    }

    // 5. Generate unique return identifier
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const returnNumber = `RET-${new Date().getFullYear()}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      const createdReturn = await tx.returnRequest.create({
        data: {
          returnNumber,
          orderId: order.id,
          userId,
          reason: dto.reason,
          action: dto.action || ReturnAction.REFUND,
          customerNote: dto.customerNote,
          evidenceImages: dto.evidenceImages || [],
          pickupAddress: (dto.pickupAddress || {
            name: order.shippingAddress.recipientName,
            phone: order.shippingAddress.phone,
            street: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postalCode: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
          }) as any,
          bankDetails: this.sanitizeIncomingBankDetails(dto.bankDetails) as any,
          status: ReturnStatus.REQUESTED,
          items: {
            create: dto.items.map((i) => ({
              orderItemId: i.orderItemId,
              quantity: i.quantity,
              reason: i.reason || dto.reason,
            })),
          },
        },
        include: {
          items: {
            include: { orderItem: true },
          },
        },
      });

      // Update Order Status
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RETURN_REQUESTED',
          entity: 'ReturnRequest',
          entityId: createdReturn.id,
          details: {
            returnNumber,
            orderNumber: order.orderNumber,
            action: dto.action || 'REFUND',
            itemCount: dto.items.length,
          },
        },
      });

      // Notification
      await this.notificationsService.sendNotification({
        userId,
        type: NotificationType.RETURN_REQUESTED,
        title: 'Return Request Received',
        message: `Your return request #${returnNumber} for order #${order.orderNumber} has been received and is under review.`,
        link: `/orders/${order.id}`,
      });

      return this.formatReturnRequest(createdReturn);
    });
  }

  // =========================================================================
  // 2. CUSTOMER: FIND MY RETURNS
  // =========================================================================

  async findUserReturns(userId: string, query: ReturnQueryDto) {
    const { page = 1, limit = 10, status, action } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;
    if (action) where.action = action;

    const [returns, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  productTitle: true,
                  variantTitle: true,
                  sku: true,
                  imageUrl: true,
                  unitPrice: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      data: returns.map((r) => this.formatReturnRequest(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // 3. GET RETURN DETAILS (CUSTOMER & ADMIN)
  // =========================================================================

  async findReturnById(id: string, userId?: string, userRole?: string) {
    const returnRequest = await this.prisma.returnRequest.findFirst({
      where: {
        OR: [{ id }, { returnNumber: id }],
      },
      include: {
        order: {
          include: {
            shippingAddress: true,
            payment: true,
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        items: {
          include: {
            orderItem: true,
          },
        },
        refund: true,
      },
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request not found: ${id}`);
    }

    if (
      userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.STAFF &&
      returnRequest.userId !== userId
    ) {
      throw new ForbiddenException('Access denied to return request');
    }

    if (userRole === Role.ADMIN || userRole === Role.STAFF) {
      return returnRequest;
    }

    return this.formatReturnRequest(returnRequest);
  }

  // =========================================================================
  // 4. CUSTOMER: CANCEL RETURN REQUEST
  // =========================================================================

  async cancelReturn(id: string, userId: string) {
    const returnRequest = await this.prisma.returnRequest.findFirst({
      where: { id, userId },
      include: { order: { include: { returnRequests: true } } },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    const nonCancellableStates: ReturnStatus[] = [
      ReturnStatus.PICKED_UP,
      ReturnStatus.RECEIVED,
      ReturnStatus.QUALITY_CHECK,
      ReturnStatus.REFUND_PENDING,
      ReturnStatus.REFUNDED,
      ReturnStatus.COMPLETED,
      ReturnStatus.CANCELLED,
    ];

    if (nonCancellableStates.includes(returnRequest.status)) {
      throw new BadRequestException(
        `Cannot cancel return request in status '${returnRequest.status}'`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: { status: ReturnStatus.CANCELLED },
      });

      // If all other returns are cancelled/rejected, reset Order status to DELIVERED
      const otherActiveReturns = returnRequest.order.returnRequests.filter(
        (r) => r.id !== returnRequest.id && r.status !== ReturnStatus.CANCELLED && r.status !== ReturnStatus.REJECTED,
      );

      if (otherActiveReturns.length === 0) {
        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RETURN_CANCELLED',
          entity: 'ReturnRequest',
          entityId: returnRequest.id,
          details: { returnNumber: returnRequest.returnNumber },
        },
      });

      // Notification
      await this.notificationsService.sendNotification({
        userId,
        type: NotificationType.ORDER_DELIVERED,
        title: 'Return Request Cancelled',
        message: `Your return request #${returnRequest.returnNumber} has been cancelled.`,
        link: `/orders/${returnRequest.orderId}`,
      });

      return this.formatReturnRequest(updated);
    });
  }

  // =========================================================================
  // 5. ADMIN: LIST ALL RETURNS WITH FILTERS
  // =========================================================================

  async findAllAdminReturns(query: ReturnQueryDto) {
    const { page = 1, limit = 10, status, action, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (action) where.action = action;

    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        { pickupAwb: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [returns, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              orderItem: {
                select: {
                  productTitle: true,
                  variantTitle: true,
                  sku: true,
                  unitPrice: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      data: returns.map((r) => this.formatReturnRequest(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // 6. ADMIN: APPROVE RETURN & SCHEDULE REVERSE PICKUP
  // =========================================================================

  async approveReturn(id: string, adminUserId: string, dto?: ApproveReturnDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { include: { shippingAddress: true, user: true } },
        items: { include: { orderItem: true } },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request not found: ${id}`);
    }

    if (
      returnRequest.status !== ReturnStatus.REQUESTED &&
      returnRequest.status !== ReturnStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot approve return in status '${returnRequest.status}'. Must be REQUESTED or UNDER_REVIEW.`,
      );
    }

    // Schedule reverse pickup via Courier Provider
    const provider = this.shippingProviderFactory.getProvider();
    const pickupResult = await provider.scheduleReturnPickup({
      orderId: returnRequest.order.id,
      orderNumber: returnRequest.order.orderNumber,
      returnNumber: returnRequest.returnNumber,
      customerName: returnRequest.order.shippingAddress?.recipientName || 'Customer',
      customerPhone: returnRequest.order.shippingAddress?.phone || '0000000000',
      pickupAddress: (returnRequest.pickupAddress as any) || {
        street: returnRequest.order.shippingAddress?.street,
        city: returnRequest.order.shippingAddress?.city,
        state: returnRequest.order.shippingAddress?.state,
        postalCode: returnRequest.order.shippingAddress?.postalCode,
        country: returnRequest.order.shippingAddress?.country,
      },
      items: returnRequest.items.map((i) => ({
        title: i.orderItem?.productTitle || 'Item',
        quantity: i.quantity,
      })),
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.PICKUP_SCHEDULED,
          approvedAt: new Date(),
          pickupAwb: pickupResult.pickupAwb,
          adminNote: dto?.adminNote || returnRequest.adminNote,
        },
      });

      await tx.order.update({
        where: { id: returnRequest.orderId },
        data: { status: OrderStatus.RETURN_APPROVED },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'RETURN_APPROVED',
          entity: 'ReturnRequest',
          entityId: returnRequest.id,
          details: {
            returnNumber: returnRequest.returnNumber,
            pickupAwb: pickupResult.pickupAwb,
          },
        },
      });

      // Notification
      await this.notificationsService.sendNotification({
        userId: returnRequest.userId,
        type: NotificationType.RETURN_APPROVED,
        title: 'Return Request Approved',
        message: `Your return request #${returnRequest.returnNumber} has been approved. Courier pickup scheduled (AWB: ${pickupResult.pickupAwb}).`,
        link: `/orders/${returnRequest.orderId}`,
      });

      return this.formatReturnRequest(updated);
    });
  }

  // =========================================================================
  // 7. ADMIN: REJECT RETURN REQUEST
  // =========================================================================

  async rejectReturn(id: string, adminUserId: string, dto: RejectReturnDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { include: { returnRequests: true } },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request not found: ${id}`);
    }

    if (
      returnRequest.status !== ReturnStatus.REQUESTED &&
      returnRequest.status !== ReturnStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot reject return in status '${returnRequest.status}'. Must be REQUESTED or UNDER_REVIEW.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.REJECTED,
          adminNote: dto.rejectionReason,
        },
      });

      // If all other returns are rejected, mark order as RETURN_REJECTED
      const activeReturns = returnRequest.order.returnRequests.filter(
        (r) => r.id !== returnRequest.id && r.status !== ReturnStatus.CANCELLED && r.status !== ReturnStatus.REJECTED,
      );

      if (activeReturns.length === 0) {
        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: { status: OrderStatus.RETURN_REJECTED },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'RETURN_REJECTED',
          entity: 'ReturnRequest',
          entityId: returnRequest.id,
          details: {
            returnNumber: returnRequest.returnNumber,
            reason: dto.rejectionReason,
          },
        },
      });

      // Notification
      await this.notificationsService.sendNotification({
        userId: returnRequest.userId,
        type: NotificationType.RETURN_REJECTED,
        title: 'Return Request Rejected',
        message: `Your return request #${returnRequest.returnNumber} was not approved. Reason: ${dto.rejectionReason}`,
        link: `/orders/${returnRequest.orderId}`,
      });

      return this.formatReturnRequest(updated);
    });
  }

  // =========================================================================
  // 8. ADMIN: MARK RETURN RECEIVED AT FULFILLMENT CENTER
  // =========================================================================

  async markReturnReceived(id: string, adminUserId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request not found: ${id}`);
    }

    const eligibleStatuses: ReturnStatus[] = [
      ReturnStatus.APPROVED,
      ReturnStatus.PICKUP_SCHEDULED,
      ReturnStatus.PICKED_UP,
    ];

    if (!eligibleStatuses.includes(returnRequest.status)) {
      throw new BadRequestException(
        `Cannot mark return received from status '${returnRequest.status}'`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.RECEIVED,
          receivedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: returnRequest.orderId },
        data: { status: OrderStatus.RETURN_RECEIVED },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'RETURN_RECEIVED',
          entity: 'ReturnRequest',
          entityId: returnRequest.id,
          details: { returnNumber: returnRequest.returnNumber },
        },
      });

      // Notification
      await this.notificationsService.sendNotification({
        userId: returnRequest.userId,
        type: NotificationType.RETURN_RECEIVED,
        title: 'Return Package Received',
        message: `Your return package #${returnRequest.returnNumber} was received at our fulfillment center and is undergoing quality inspection.`,
        link: `/orders/${returnRequest.orderId}`,
      });

      return this.formatReturnRequest(updated);
    });
  }

  // =========================================================================
  // 9. ADMIN: QUALITY CHECK (RESTOCKING & REFUND/REPLACEMENT ADVANCEMENT)
  // =========================================================================

  async performQualityCheck(id: string, adminUserId: string, dto: QualityCheckDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        items: { include: { orderItem: true } },
        order: true,
      },
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request not found: ${id}`);
    }

    if (
      returnRequest.status !== ReturnStatus.RECEIVED &&
      returnRequest.status !== ReturnStatus.QUALITY_CHECK
    ) {
      throw new BadRequestException(
        `Quality check can only be performed after package is RECEIVED. Current status: '${returnRequest.status}'`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let nextReturnStatus: ReturnStatus = ReturnStatus.REFUND_PENDING;
      let nextOrderStatus: OrderStatus = OrderStatus.REFUND_PENDING;

      if (dto.qcResult === QualityCheckResult.FAILED_FRAUD_OR_MISMATCH) {
        nextReturnStatus = ReturnStatus.REJECTED;
        nextOrderStatus = OrderStatus.RETURN_REJECTED;
      } else if (returnRequest.action === ReturnAction.REPLACEMENT) {
        nextReturnStatus = ReturnStatus.REPLACEMENT_PENDING;
        nextOrderStatus = OrderStatus.PROCESSING;
      }

      // Restock if passed and restockable
      if (
        dto.qcResult === QualityCheckResult.PASSED_RESTOCKABLE &&
        dto.restockItems !== false
      ) {
        for (const item of returnRequest.items) {
          if (!item.restocked && item.orderItem) {
            await tx.productVariant.update({
              where: { id: item.orderItem.variantId },
              data: { stockQuantity: { increment: item.quantity } },
            });
            await tx.returnItem.update({
              where: { id: item.id },
              data: { restocked: true },
            });
          }
        }
      }

      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: nextReturnStatus,
          qcResult: dto.qcResult,
          qcNotes: dto.qcNotes,
        },
      });

      await tx.order.update({
        where: { id: returnRequest.orderId },
        data: { status: nextOrderStatus },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'RETURN_QC_COMPLETED',
          entity: 'ReturnRequest',
          entityId: returnRequest.id,
          details: {
            returnNumber: returnRequest.returnNumber,
            qcResult: dto.qcResult,
            restocked: dto.qcResult === QualityCheckResult.PASSED_RESTOCKABLE && dto.restockItems !== false,
          },
        },
      });

      return this.formatReturnRequest(updated);
    });
  }

  // =========================================================================
  // 10. ADMIN: PROCESS REPLACEMENT DISPATCH
  // =========================================================================

  async processReplacement(id: string, adminUserId: string, dto?: ProcessReplacementDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request not found: ${id}`);
    }

    if (returnRequest.action !== ReturnAction.REPLACEMENT) {
      throw new BadRequestException('This return request was created for a REFUND, not a replacement');
    }

    if (
      returnRequest.status !== ReturnStatus.REPLACEMENT_PENDING &&
      returnRequest.status !== ReturnStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot dispatch replacement in status '${returnRequest.status}'. Must be REPLACEMENT_PENDING.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.COMPLETED,
          completedAt: new Date(),
          adminNote: dto?.notes || returnRequest.adminNote,
        },
      });

      await tx.order.update({
        where: { id: returnRequest.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          trackingNumber: dto?.trackingNumber || returnRequest.order.trackingNumber,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'REPLACEMENT_PROCESSED',
          entity: 'ReturnRequest',
          entityId: returnRequest.id,
          details: {
            returnNumber: returnRequest.returnNumber,
            replacementTracking: dto?.trackingNumber,
          },
        },
      });

      return this.formatReturnRequest(updated);
    });
  }

  // =========================================================================
  // 11. ADMIN: RETRY RETURN PICKUP SCHEDULING
  // =========================================================================

  async retryReturnPickup(id: string, adminUserId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { include: { shippingAddress: true, user: true } },
        items: { include: { orderItem: true } },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request not found: ${id}`);
    }

    const provider = this.shippingProviderFactory.getProvider();
    const pickupResult = await provider.scheduleReturnPickup({
      orderId: returnRequest.order.id,
      orderNumber: returnRequest.order.orderNumber,
      returnNumber: returnRequest.returnNumber,
      customerName: returnRequest.order.shippingAddress?.recipientName || 'Customer',
      customerPhone: returnRequest.order.shippingAddress?.phone || '0000000000',
      pickupAddress: (returnRequest.pickupAddress as any) || {
        street: returnRequest.order.shippingAddress?.street,
        city: returnRequest.order.shippingAddress?.city,
        state: returnRequest.order.shippingAddress?.state,
        postalCode: returnRequest.order.shippingAddress?.postalCode,
        country: returnRequest.order.shippingAddress?.country,
      },
      items: returnRequest.items.map((i) => ({
        title: i.orderItem?.productTitle || 'Item',
        quantity: i.quantity,
      })),
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.PICKUP_SCHEDULED,
          pickupAwb: pickupResult.pickupAwb,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'RETURN_PICKUP_RETRIED',
          entity: 'ReturnRequest',
          entityId: returnRequest.id,
          details: {
            returnNumber: returnRequest.returnNumber,
            pickupAwb: pickupResult.pickupAwb,
          },
        },
      });

      return this.formatReturnRequest(updated);
    });
  }

  // =========================================================================
  // 12. REVERSE COURIER WEBHOOK (IDEMPOTENT & REPLAY PROTECTED)
  // =========================================================================

  async handleCourierReturnWebhook(
    providerName: string,
    headers: Record<string, any>,
    payload: WebhookReturnDto,
  ) {
    const provider = this.shippingProviderFactory.getProvider(providerName);
    const isValidSignature = provider.verifyWebhookSignature(headers, payload);
    if (!isValidSignature) {
      throw new ForbiddenException('Invalid reverse courier webhook cryptographic signature');
    }

    // Idempotency check in Redis
    const cacheKey = `webhook_return:${payload.eventId}`;
    const alreadyProcessed = await this.redisService.get(cacheKey);
    if (alreadyProcessed) {
      return { received: true, idempotent: true, eventId: payload.eventId };
    }

    const returnRequest = await this.prisma.returnRequest.findFirst({
      where: { pickupAwb: payload.pickupAwb },
      include: { order: true },
    });

    if (!returnRequest) {
      this.logger.warn(`Reverse webhook received for unknown pickup AWB: ${payload.pickupAwb}`);
      return { received: true, warning: 'Pickup AWB not found' };
    }

    if (payload.status === ReturnStatus.PICKED_UP && returnRequest.status !== ReturnStatus.PICKED_UP) {
      await this.prisma.$transaction(async (tx) => {
        await tx.returnRequest.update({
          where: { id: returnRequest.id },
          data: { status: ReturnStatus.PICKED_UP, pickedUpAt: new Date() },
        });

        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: { status: OrderStatus.RETURN_PICKED_UP },
        });
      });

      await this.notificationsService.sendNotification({
        userId: returnRequest.userId,
        type: NotificationType.RETURN_PICKED_UP,
        title: 'Return Package Picked Up',
        message: `Your return package #${returnRequest.returnNumber} was picked up by courier (AWB: ${payload.pickupAwb}).`,
        link: `/orders/${returnRequest.orderId}`,
      });
    } else if (payload.status === ReturnStatus.RECEIVED && returnRequest.status !== ReturnStatus.RECEIVED) {
      await this.markReturnReceived(returnRequest.id, 'SYSTEM_REVERSE_COURIER_WEBHOOK');
    }

    // Cache eventId in Redis for 7 days
    await this.redisService.set(cacheKey, '1', 604800);

    return { received: true, eventId: payload.eventId };
  }
}
