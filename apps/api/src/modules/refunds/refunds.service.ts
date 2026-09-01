import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import {
  CreateRefundDto,
  ProcessRefundDto,
  RefundQueryDto,
} from './refunds.dto';
import {
  RefundStatus,
  PaymentStatus,
  OrderStatus,
  PaymentProvider,
  ReturnStatus,
  Role,
} from '@ecommerce/types';
import { NotificationType } from '@ecommerce/database';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
    private paymentProviderFactory: PaymentProviderFactory,
  ) {}

  // =========================================================================
  // 1. INITIATE AND PROCESS REFUND (ONLINE GATEWAY OR COD BANK TRANSFER)
  // =========================================================================

  async initiateRefund(userId: string, userRole: string, dto: CreateRefundDto) {
    // 1. Fetch Order and Payment
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        payment: true,
        refunds: true,
        returnRequests: {
          include: { items: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${dto.orderId}`);
    }

    if (
      userRole !== Role.ADMIN &&
      userRole !== Role.STAFF &&
      order.userId !== userId
    ) {
      throw new ForbiddenException('You do not have permission to refund this order');
    }

    if (!order.payment) {
      throw new BadRequestException('Order does not have an associated payment record');
    }

    // 2. Validate refundable payment status
    const refundableStatuses: PaymentStatus[] = [
      PaymentStatus.CAPTURED,
      PaymentStatus.PAID,
      PaymentStatus.COD_COLLECTED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ];

    if (!refundableStatuses.includes(order.payment.status)) {
      throw new BadRequestException(
        `Cannot process refund for payment in status '${order.payment.status}'. Payment must be CAPTURED or COD_COLLECTED.`,
      );
    }

    // 3. Idempotency Check
    const idempotencyKey = dto.idempotencyKey || `idemp_ref_${order.id}_${dto.returnRequestId || 'direct'}_${Date.now()}`;
    const existingRefund = await this.prisma.refund.findUnique({
      where: { idempotencyKey },
      include: { transactions: true },
    });

    if (existingRefund) {
      this.logger.log(`Returning existing idempotent refund: ${existingRefund.refundNumber}`);
      return existingRefund;
    }

    // 4. Calculate existing refund sums & validate amount limits
    const existingRefundSum = order.refunds
      .filter((r) => r.status === RefundStatus.COMPLETED || r.status === RefundStatus.PROCESSING || r.status === RefundStatus.PENDING)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const remainingRefundableAmount = Number(order.totalAmount) - existingRefundSum;

    if (remainingRefundableAmount <= 0) {
      throw new BadRequestException(
        `Order ${order.orderNumber} has already been fully refunded (Total: INR ${order.totalAmount})`,
      );
    }

    const requestedAmount = dto.amount ? Number(dto.amount) : remainingRefundableAmount;

    if (requestedAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    if (requestedAmount > remainingRefundableAmount) {
      throw new BadRequestException(
        `Requested refund amount (INR ${requestedAmount}) exceeds remaining refundable balance (INR ${remainingRefundableAmount})`,
      );
    }

    // 5. Generate unique refund number
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const refundNumber = `REF-${new Date().getFullYear()}-${randomSuffix}`;

    // 6. Create Refund in PENDING state
    const createdRefund = await this.prisma.refund.create({
      data: {
        refundNumber,
        orderId: order.id,
        paymentId: order.payment.id,
        returnRequestId: dto.returnRequestId,
        amount: requestedAmount,
        currency: 'INR',
        reason: dto.reason,
        status: RefundStatus.PROCESSING,
        idempotencyKey,
      },
    });

    // 7. Execute Money Movement via Existing Payment Provider Abstraction
    let gatewayRefundId = `GATEWAY-REF-${Date.now()}`;
    let gatewayName = 'COD_BANK_TRANSFER';
    let rawResponse: any = {};

    try {
      if (order.payment.provider !== PaymentProvider.COD) {
        gatewayName = order.payment.provider;
        const provider = this.paymentProviderFactory.getProvider(order.payment.provider);

        const providerResult = await provider.processRefund({
          paymentId: order.payment.id,
          transactionId: order.payment.transactionId || '',
          amount: requestedAmount,
          reason: dto.reason,
        });

        gatewayRefundId = providerResult.refundId;
        rawResponse = providerResult;
      } else {
        // COD Payout record
        const returnReq = order.returnRequests.find((r) => r.id === dto.returnRequestId);
        gatewayName = 'COD_BANK_TRANSFER';
        gatewayRefundId = `COD-PAYOUT-${Date.now()}`;
        rawResponse = {
          method: 'BANK_ACCOUNT_TRANSFER',
          bankDetails: returnReq?.bankDetails || 'Registered Customer Account',
          processedAt: new Date(),
        };
      }

      // 8. Atomically complete Refund, update Payment, Order, and ReturnRequest
      return await this.prisma.$transaction(async (tx) => {
        const completedRefund = await tx.refund.update({
          where: { id: createdRefund.id },
          data: {
            status: RefundStatus.COMPLETED,
            completedAt: new Date(),
            gatewayRefundId,
          },
        });

        // Record Audit Transaction Ledger
        await tx.refundTransaction.create({
          data: {
            refundId: completedRefund.id,
            amount: requestedAmount,
            gateway: gatewayName,
            gatewayReference: gatewayRefundId,
            status: RefundStatus.COMPLETED,
            rawResponse,
          },
        });

        // Update Payment status
        const isFullRefund = existingRefundSum + requestedAmount >= Number(order.totalAmount);
        await tx.payment.update({
          where: { id: order.payment!.id },
          data: {
            status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
          },
        });

        // Update Order status
        if (isFullRefund) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.REFUNDED },
          });
        }

        // Update ReturnRequest if linked
        if (dto.returnRequestId) {
          await tx.returnRequest.update({
            where: { id: dto.returnRequestId },
            data: {
              status: ReturnStatus.REFUNDED,
              completedAt: new Date(),
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'REFUND_COMPLETED',
            entity: 'Refund',
            entityId: completedRefund.id,
            details: {
              refundNumber,
              orderNumber: order.orderNumber,
              amount: requestedAmount,
              gateway: gatewayName,
              gatewayRefundId,
            },
          },
        });

        // Customer Notification
        await this.notificationsService.sendNotification({
          userId: order.userId,
          type: NotificationType.REFUND_COMPLETED,
          title: 'Refund Processed Successfully',
          message: `Your refund #${refundNumber} of INR ${requestedAmount} for order #${order.orderNumber} has been completed.`,
          link: `/orders/${order.id}`,
        });

        return completedRefund;
      });
    } catch (err: any) {
      this.logger.error(`Refund processing failed for order ${order.orderNumber}: ${err.message}`);

      await this.prisma.refund.update({
        where: { id: createdRefund.id },
        data: {
          status: RefundStatus.FAILED,
          failureReason: err.message || 'Payment gateway refund failed',
        },
      });

      await this.prisma.refundTransaction.create({
        data: {
          refundId: createdRefund.id,
          amount: requestedAmount,
          gateway: gatewayName,
          status: RefundStatus.FAILED,
          rawResponse: { error: err.message },
        },
      });

      throw new BadRequestException(
        `Refund execution failed: ${err.message || 'Gateway communication error'}`,
      );
    }
  }

  // =========================================================================
  // 2. GET REFUND DETAILS
  // =========================================================================

  async getRefundById(id: string, userId?: string, userRole?: string) {
    const refund = await this.prisma.refund.findFirst({
      where: {
        OR: [{ id }, { refundNumber: id }, { gatewayRefundId: id }],
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            payment: true,
          },
        },
        returnRequest: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund not found: ${id}`);
    }

    if (
      userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.STAFF &&
      refund.order?.userId !== userId
    ) {
      throw new ForbiddenException('Access denied to refund details');
    }

    return refund;
  }

  // =========================================================================
  // 3. GET REFUNDS BY ORDER ID
  // =========================================================================

  async getRefundsByOrderId(orderId: string, userId?: string, userRole?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        refunds: {
          include: { transactions: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    if (
      userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.STAFF &&
      order.userId !== userId
    ) {
      throw new ForbiddenException('Access denied to order refunds');
    }

    return order.refunds;
  }

  // =========================================================================
  // 4. ADMIN: LIST ALL REFUNDS WITH FILTERING & METRICS
  // =========================================================================

  async findAllAdminRefunds(query: RefundQueryDto) {
    const { page = 1, limit = 10, status, orderId, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    if (search) {
      where.OR = [
        { refundNumber: { contains: search, mode: 'insensitive' } },
        { gatewayRefundId: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [refunds, total, completedAggregate, pendingAggregate] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          transactions: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.refund.count({ where }),
      this.prisma.refund.aggregate({
        where: { status: RefundStatus.COMPLETED },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.refund.aggregate({
        where: { status: RefundStatus.PENDING },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      data: refunds,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        completedAmount: Number(completedAggregate._sum.amount || 0),
        completedCount: completedAggregate._count,
        pendingAmount: Number(pendingAggregate._sum.amount || 0),
        pendingCount: pendingAggregate._count,
      },
    };
  }

  // =========================================================================
  // 5. ADMIN: PROCESS / RETRY PENDING REFUND
  // =========================================================================

  async processRefundAdmin(id: string, adminUserId: string, dto?: ProcessRefundDto) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { order: { include: { payment: true } } },
    });

    if (!refund) {
      throw new NotFoundException(`Refund not found: ${id}`);
    }

    if (refund.status === RefundStatus.COMPLETED) {
      return refund;
    }

    return this.initiateRefund(adminUserId, Role.ADMIN, {
      orderId: refund.orderId,
      returnRequestId: refund.returnRequestId || undefined,
      amount: Number(refund.amount),
      reason: refund.reason,
      idempotencyKey: refund.idempotencyKey,
    });
  }
}
