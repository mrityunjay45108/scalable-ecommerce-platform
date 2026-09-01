import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RedisService } from '../redis/redis.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import {
  CreatePaymentIntentDto,
  VerifyPaymentDto,
  ConfirmPaymentDto,
  RefundPaymentDto,
  RetryPaymentDto,
} from './payments.dto';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@ecommerce/types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private redisService: RedisService,
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

    if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(`Order cannot be paid in current status: ${order.status}`);
    }

    // Always recalculate amount directly from PostgreSQL order record
    const amount = Number(order.totalAmount);

    if (dto.provider === PaymentProvider.COD) {
      await this.confirmPayment({
        orderId: order.id,
        transactionId: `COD-${order.orderNumber}`,
        paymentData: { method: 'COD' },
      });

      return {
        provider: PaymentProvider.COD,
        status: 'CONFIRMED',
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount,
      };
    }

    // Resolve payment provider abstraction
    const provider = this.providerFactory.getProvider(dto.provider);
    const orderResult = await provider.createOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      currency: 'USD',
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
        currency: 'USD',
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

    if (dto.provider === PaymentProvider.COD) {
      return this.confirmPayment({
        orderId: order.id,
        transactionId: `COD-${order.orderNumber}`,
      });
    }

    const provider = this.providerFactory.getProvider(dto.provider);
    const verification = await provider.verifyPayment({
      orderId: order.id,
      providerOrderId: dto.providerOrderId || order.payment?.paymentIntentId || '',
      providerPaymentId: dto.providerPaymentId,
      signature: dto.signature || '',
    });

    if (!verification.isValid) {
      // Mark payment failed in DB
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
  // 3. CONFIRM PAYMENT & COMMIT INVENTORY
  // =========================================================================

  async confirmPayment(dto: ConfirmPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.PROCESSING || order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
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
          provider: PaymentProvider.STRIPE,
          amount: order.totalAmount,
          currency: 'USD',
          transactionId: dto.transactionId,
          status: PaymentStatus.CAPTURED,
          rawResponse: dto.paymentData || {},
        },
      });

      // 2. Transition Order to PROCESSING
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PROCESSING },
        include: { items: true, payment: true },
      });

      // 3. Commit inventory stock permanently
      const reservationItems = order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      await this.inventoryService.commitStock(order.orderNumber, reservationItems);

      this.logger.log(`Payment confirmed & captured for order ${order.orderNumber} (TX: ${dto.transactionId})`);

      return {
        success: true,
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      };
    });
  }

  // =========================================================================
  // 4. WEBHOOK PROCESSING WITH IDEMPOTENCY
  // =========================================================================

  async handleWebhook(providerName: string, payload: any, signature?: string, rawBody?: string) {
    this.logger.log(`Received webhook from provider: ${providerName}`);

    const provider = this.providerFactory.getProvider(providerName);

    // Verify signature
    if (signature) {
      const isValid = provider.verifyWebhookSignature(rawBody || payload, signature);
      if (!isValid) {
        this.logger.warn(`Webhook signature verification failed for ${providerName}`);
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Idempotency check using Event ID
    const eventId =
      payload?.id ||
      payload?.event_id ||
      payload?.payload?.payment?.entity?.id ||
      `evt_${Date.now()}`;

    const alreadyProcessed = await this.redisService.get(`webhook_idempotency:${eventId}`);
    if (alreadyProcessed) {
      this.logger.log(`Webhook event ${eventId} already processed (idempotent skip)`);
      return { received: true, idempotent: true };
    }

    // Process provider events
    const normalized = providerName.toUpperCase();

    if (normalized === 'RAZORPAY') {
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
            await this.markPaymentFailed(payment.orderId, paymentEntity?.error_description || 'Payment failed');
          }
        }
      }
    } else if (normalized === 'STRIPE') {
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

    // Mark event processed in Redis for 7 days
    await this.redisService.set(`webhook_idempotency:${eventId}`, '1', 604800);

    return { received: true, eventId };
  }

  // =========================================================================
  // 5. REFUND ARCHITECTURE
  // =========================================================================

  async processRefund(orderId: string, dto: RefundPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true },
    });

    if (!order || !order.payment) {
      throw new NotFoundException('Order or payment record not found');
    }

    if (order.payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException('Only captured payments can be refunded');
    }

    const refundAmount = dto.amount || Number(order.totalAmount);
    if (refundAmount > Number(order.totalAmount)) {
      throw new BadRequestException('Refund amount cannot exceed total order amount');
    }

    const provider = this.providerFactory.getProvider(order.payment.provider);
    const refundResult = await provider.processRefund({
      paymentId: order.payment.id,
      transactionId: order.payment.transactionId || '',
      amount: refundAmount,
      reason: dto.reason,
    });

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

      // Update Order Status to CANCELLED if full refund
      if (refundAmount >= Number(order.totalAmount)) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });

        // Release inventory back to stock
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
  // 6. FAILED PAYMENTS & PAYMENT RETRY
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

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not in pending payment state');
    }

    const providerToUse = dto.provider || (order.payment?.provider as PaymentProvider) || PaymentProvider.RAZORPAY;

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
