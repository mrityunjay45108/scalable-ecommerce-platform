import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import {
  CreatePaymentIntentDto,
  VerifyPaymentDto,
  ConfirmPaymentDto,
  RefundPaymentDto,
  RetryPaymentDto,
  ConfirmCodCollectionDto,
  SettleCodDto,
  CodLedgerQueryDto,
} from './payments.dto';
import {
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
  CODStatus,
  Role,
} from '@ecommerce/types';
import { NotificationType } from '@ecommerce/database';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
    private providerFactory: PaymentProviderFactory,
  ) {}

  // =========================================================================
  // 1. CREATE PAYMENT ORDER / INTENT
  // =========================================================================

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: { payment: true, user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PROCESSING
    ) {
      throw new BadRequestException(`Order cannot be paid in current status: ${order.status}`);
    }

    const amount = Number(order.totalAmount);

    // If COD, ensure COD_PENDING status and do not auto-confirm
    if (dto.provider === PaymentProvider.COD) {
      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          provider: PaymentProvider.COD,
          status: PaymentStatus.COD_PENDING,
          amount,
        },
        create: {
          orderId: order.id,
          provider: PaymentProvider.COD,
          amount,
          currency: 'INR',
          status: PaymentStatus.COD_PENDING,
        },
      });

      await this.prisma.cODTransaction.upsert({
        where: { orderId: order.id },
        update: {
          status: CODStatus.COD_PENDING,
          amount,
        },
        create: {
          orderId: order.id,
          amount,
          currency: 'INR',
          status: CODStatus.COD_PENDING,
        },
      });

      return {
        provider: PaymentProvider.COD,
        status: PaymentStatus.COD_PENDING,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount,
        isCod: true,
      };
    }

    // Resolve payment provider abstraction
    const provider = this.providerFactory.getProvider(dto.provider);
    const orderResult = await provider.createOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      currency: 'INR',
      customerEmail: order.user?.email,
      customerPhone: order.user?.phone || undefined,
    });

    // Update payment record with gateway order/intent ID in PENDING state
    await this.prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        provider: dto.provider,
        paymentIntentId: orderResult.providerOrderId,
        status: PaymentStatus.PENDING,
        amount,
      },
      create: {
        orderId: order.id,
        provider: dto.provider,
        amount,
        currency: 'INR',
        paymentIntentId: orderResult.providerOrderId,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      ...orderResult,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  // =========================================================================
  // 2. VERIFY PAYMENT (CRYPTOGRAPHIC SIGNATURE VERIFICATION)
  // =========================================================================

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (dto.provider === PaymentProvider.COD || order.payment?.provider === PaymentProvider.COD) {
      throw new BadRequestException(
        'Cash On Delivery (COD) cannot be confirmed manually. It is collected upon delivery.',
      );
    }

    const provider = this.providerFactory.getProvider(dto.provider);
    const verification = await provider.verifyPayment({
      orderId: order.id,
      providerOrderId: dto.providerOrderId || order.payment?.paymentIntentId || '',
      providerPaymentId: dto.providerPaymentId,
      signature: dto.signature || '',
    });

    if (!verification.isValid) {
      await this.markPaymentFailed(order.id, verification.error || 'Payment verification failed');
      throw new BadRequestException(verification.error || 'Payment cryptographic verification failed');
    }

    return this.confirmPayment({
      orderId: order.id,
      transactionId: verification.transactionId,
      paymentData: { verifiedAt: new Date(), provider: dto.provider },
    });
  }

  // =========================================================================
  // 3. CONFIRM ONLINE PAYMENT & COMMIT INVENTORY
  // =========================================================================

  async confirmPayment(dto: ConfirmPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.payment?.provider === PaymentProvider.COD) {
      throw new BadRequestException(
        'COD orders cannot be confirmed via online payment confirmation endpoint.',
      );
    }

    if (
      order.payment?.status === PaymentStatus.CAPTURED ||
      order.payment?.status === PaymentStatus.PAID
    ) {
      return { success: true, message: 'Payment already processed', orderId: order.id };
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Payment record to CAPTURED
      await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          transactionId: dto.transactionId,
          status: PaymentStatus.CAPTURED,
          rawResponse: dto.paymentData || {},
        },
        create: {
          orderId: order.id,
          provider: PaymentProvider.RAZORPAY,
          amount: order.totalAmount,
          currency: 'INR',
          transactionId: dto.transactionId,
          status: PaymentStatus.CAPTURED,
          rawResponse: dto.paymentData || {},
        },
      });

      // 2. Advance Order status to PROCESSING / CONFIRMED
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PROCESSING },
      });

      // 3. Commit reserved stock
      await this.inventoryService.commitStock(
        order.orderNumber,
        order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      );

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: order.userId,
          action: 'PAYMENT_CAPTURED',
          entity: 'Payment',
          entityId: order.id,
          details: {
            orderNumber: order.orderNumber,
            transactionId: dto.transactionId,
            amount: Number(order.totalAmount),
          },
        },
      });

      // 5. Dispatch notification
      await this.notificationsService.sendNotification({
        userId: order.userId,
        type: NotificationType.PAYMENT_SUCCESSFUL,
        title: 'Payment Successful',
        message: `Your payment of INR ${order.totalAmount} for order ${order.orderNumber} was confirmed.`,
        link: `/orders/${order.id}`,
      });

      this.logger.log(`Confirmed online payment for order ${order.orderNumber}: ${dto.transactionId}`);
      return { success: true, orderId: order.id };
    });
  }

  // =========================================================================
  // 4. COD COLLECTION CONFIRMATION (ADMIN / DELIVERY AGENT / WEBHOOK)
  // =========================================================================

  async confirmCodCollection(orderId: string, adminUserId: string, dto?: ConfirmCodCollectionDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, codTransaction: true, user: true, items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    if (order.payment?.provider !== PaymentProvider.COD) {
      throw new BadRequestException(`Order ${order.orderNumber} is not a Cash On Delivery order`);
    }

    if (
      order.payment?.status === PaymentStatus.COD_COLLECTED ||
      order.payment?.status === PaymentStatus.COD_SETTLED
    ) {
      throw new BadRequestException(
        `COD has already been collected for order ${order.orderNumber}`,
      );
    }

    const receiptNumber = dto?.receiptNumber || `REC-COD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Payment to COD_COLLECTED
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.COD_COLLECTED,
          transactionId: receiptNumber,
          rawResponse: {
            collectedBy: dto?.collectedBy || 'Delivery Executive',
            courierReference: dto?.courierReference,
            notes: dto?.notes,
            collectedAt: new Date(),
          },
        },
      });

      // 2. Update/Upsert COD Transaction
      await tx.cODTransaction.upsert({
        where: { orderId: order.id },
        update: {
          status: CODStatus.COD_COLLECTED,
          collectedAt: new Date(),
          collectedBy: dto?.collectedBy || 'Delivery Executive',
          courierReference: dto?.courierReference,
          receiptNumber,
          notes: dto?.notes,
        },
        create: {
          orderId: order.id,
          amount: order.totalAmount,
          currency: 'INR',
          status: CODStatus.COD_COLLECTED,
          collectedAt: new Date(),
          collectedBy: dto?.collectedBy || 'Delivery Executive',
          courierReference: dto?.courierReference,
          receiptNumber,
          notes: dto?.notes,
        },
      });

      // 3. Mark Order as DELIVERED if not already
      if (order.status !== OrderStatus.DELIVERED) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DELIVERED },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'COD_COLLECTED',
          entity: 'Order',
          entityId: order.id,
          details: {
            orderNumber: order.orderNumber,
            amount: Number(order.totalAmount),
            receiptNumber,
            collectedBy: dto?.collectedBy,
          },
        },
      });

      // 5. Customer Notification
      await this.notificationsService.sendNotification({
        userId: order.userId,
        type: NotificationType.COD_COLLECTED,
        title: 'Cash Collected Successfully',
        message: `Cash on Delivery payment of INR ${order.totalAmount} for order ${order.orderNumber} has been received.`,
        link: `/orders/${order.id}`,
      });

      this.logger.log(`COD collection confirmed for order ${order.orderNumber} [Receipt: ${receiptNumber}]`);

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: PaymentStatus.COD_COLLECTED,
        receiptNumber,
        amount: Number(order.totalAmount),
      };
    });
  }

  // =========================================================================
  // 5. COD SETTLEMENT (ADMIN / FINANCE RECONCILIATION)
  // =========================================================================

  async settleCodTransaction(orderId: string, adminUserId: string, dto?: SettleCodDto) {
    const codTx = await this.prisma.cODTransaction.findUnique({
      where: { orderId },
      include: { order: { include: { payment: true } } },
    });

    if (!codTx) {
      throw new NotFoundException(`COD transaction not found for order: ${orderId}`);
    }

    if (codTx.status === CODStatus.COD_SETTLED) {
      throw new BadRequestException('COD transaction is already settled');
    }

    if (codTx.status !== CODStatus.COD_COLLECTED) {
      throw new BadRequestException(
        `Cannot settle COD transaction in status '${codTx.status}'. Must be COD_COLLECTED first.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update COD Transaction
      const updatedCod = await tx.cODTransaction.update({
        where: { id: codTx.id },
        data: {
          status: CODStatus.COD_SETTLED,
          settledAt: new Date(),
          notes: dto?.notes || codTx.notes,
        },
      });

      // 2. Update Payment status to COD_SETTLED
      await tx.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.COD_SETTLED },
      });

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'COD_SETTLED',
          entity: 'CODTransaction',
          entityId: codTx.id,
          details: {
            orderNumber: codTx.order.orderNumber,
            amount: Number(codTx.amount),
            settlementReference: dto?.settlementReference,
          },
        },
      });

      this.logger.log(`COD transaction settled for order ${codTx.order.orderNumber}`);

      return updatedCod;
    });
  }

  // =========================================================================
  // 6. ADMIN: COD LEDGER QUERY WITH SUMMARY METRICS
  // =========================================================================

  async findAllCodTransactions(query: CodLedgerQueryDto) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { courierReference: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total, pendingAggregate, collectedAggregate, settledAggregate] =
      await Promise.all([
        this.prisma.cODTransaction.findMany({
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
                status: true,
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        }),
        this.prisma.cODTransaction.count({ where }),
        this.prisma.cODTransaction.aggregate({
          where: { status: CODStatus.COD_PENDING },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.cODTransaction.aggregate({
          where: { status: CODStatus.COD_COLLECTED },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.cODTransaction.aggregate({
          where: { status: CODStatus.COD_SETTLED },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    return {
      data: transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        pendingAmount: Number(pendingAggregate._sum.amount || 0),
        pendingCount: pendingAggregate._count,
        collectedAmount: Number(collectedAggregate._sum.amount || 0),
        collectedCount: collectedAggregate._count,
        settledAmount: Number(settledAggregate._sum.amount || 0),
        settledCount: settledAggregate._count,
      },
    };
  }

  // =========================================================================
  // 7. WEBHOOK HANDLING & IDEMPOTENCY
  // =========================================================================

  async handleWebhook(providerName: string, payload: any, signature?: string) {
    const normalized = providerName.toUpperCase() as PaymentProvider;
    const eventId = payload?.id || payload?.event_id || `wh_${Date.now()}`;

    // 1. Verify cryptographic signature with constant-time equality
    const provider = this.providerFactory.getProvider(normalized);
    if (!provider) {
      throw new BadRequestException(`Unsupported payment provider: ${providerName}`);
    }

    const isValidSignature = provider.verifyWebhookSignature(payload, signature || '');
    if (!isValidSignature) {
      this.logger.warn(`Invalid cryptographic signature received for ${providerName} webhook [Event: ${eventId}]`);
      throw new ForbiddenException(`Invalid ${providerName} webhook cryptographic signature`);
    }

    // 2. Redis Idempotency Check (7-day replay protection)
    const cacheKey = `webhook_payment:${eventId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.log(`[PaymentWebhook] Duplicate webhook event detected: ${eventId}. Returning idempotent response.`);
      return { received: true, idempotent: true, eventId };
    }

    this.logger.log(`[PaymentWebhook] Processing verified event '${eventId}' from ${providerName}`);

    if (normalized === PaymentProvider.RAZORPAY) {
      const event = payload?.event;
      if (event === 'payment.captured' || event === 'order.paid') {
        const paymentEntity = payload?.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        const transactionId = paymentEntity?.id;

        if (razorpayOrderId) {
          const payment = await this.prisma.payment.findFirst({
            where: { paymentIntentId: razorpayOrderId },
          });
          if (payment) {
            await this.confirmPayment({
              orderId: payment.orderId,
              transactionId: transactionId || `rzp_${Date.now()}`,
              paymentData: payload,
            });
          }
        }
      } else if (event === 'payment.failed') {
        const paymentEntity = payload?.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        if (razorpayOrderId) {
          const payment = await this.prisma.payment.findFirst({
            where: { paymentIntentId: razorpayOrderId },
          });
          if (payment) {
            await this.markPaymentFailed(
              payment.orderId,
              paymentEntity?.error_description || 'Payment failed',
            );
          }
        }
      }
    } else if (normalized === PaymentProvider.STRIPE) {
      const eventType = payload?.type;
      if (eventType === 'payment_intent.succeeded' || eventType === 'checkout.session.completed') {
        const object = payload?.data?.object;
        const orderId = object?.metadata?.orderId;
        const transactionId = object?.id;
        if (orderId && transactionId) {
          await this.confirmPayment({ orderId, transactionId, paymentData: payload });
        }
      }
    }

    // 3. Cache processed event ID in Redis for 7 days
    await this.redisService.set(cacheKey, '1', 604800);
    return { received: true, eventId };
  }

  // =========================================================================
  // 8. REFUND PROCESSING
  // =========================================================================

  async processRefund(orderId: string, dto: RefundPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true },
    });

    if (!order || !order.payment) {
      throw new NotFoundException('Order or payment record not found');
    }

    if (
      order.payment.status !== PaymentStatus.CAPTURED &&
      order.payment.status !== PaymentStatus.PAID &&
      order.payment.status !== PaymentStatus.COD_COLLECTED
    ) {
      throw new BadRequestException(
        `Only captured or collected payments can be refunded. Current status: ${order.payment.status}`,
      );
    }

    const refundAmount = dto.amount || Number(order.totalAmount);
    if (refundAmount > Number(order.totalAmount)) {
      throw new BadRequestException('Refund amount cannot exceed total order amount');
    }

    let refundResult = { refundId: `REF-${Date.now()}` };

    // If online gateway, invoke provider
    if (order.payment.provider !== PaymentProvider.COD) {
      const provider = this.providerFactory.getProvider(order.payment.provider);
      refundResult = await provider.processRefund({
        paymentId: order.payment.id,
        transactionId: order.payment.transactionId || '',
        amount: refundAmount,
        reason: dto.reason,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Update Payment Status
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: PaymentStatus.REFUNDED,
          rawResponse: JSON.parse(
            JSON.stringify({
              ...((order.payment?.rawResponse as object) || {}),
              refund: refundResult,
            }),
          ),
        },
      });

      if (refundAmount >= Number(order.totalAmount)) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });

        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      this.logger.log(`Refund processed for order ${order.orderNumber}: ${refundResult.refundId}`);

      return {
        success: true,
        refundId: refundResult.refundId,
        amount: refundAmount,
        orderId: order.id,
      };
    });
  }

  // =========================================================================
  // 9. FAILED PAYMENTS & PAYMENT RETRY
  // =========================================================================

  async markPaymentFailed(orderId: string, reason: string) {
    this.logger.warn(`Marking payment failed for order ${orderId}: ${reason}`);

    await this.prisma.payment.updateMany({
      where: { orderId },
      data: {
        status: PaymentStatus.FAILED,
        rawResponse: { failureReason: reason, failedAt: new Date() },
      },
    });

    return { message: 'Payment marked as failed', orderId };
  }

  async retryPayment(userId: string, dto: RetryPaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException('Order is not in pending payment state');
    }

    const providerToUse =
      dto.provider || (order.payment?.provider as PaymentProvider) || PaymentProvider.RAZORPAY;

    return this.createPaymentIntent(userId, {
      orderId: order.id,
      provider: providerToUse,
    });
  }

  async getPaymentStatus(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      provider: payment.provider,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
    };
  }
}
