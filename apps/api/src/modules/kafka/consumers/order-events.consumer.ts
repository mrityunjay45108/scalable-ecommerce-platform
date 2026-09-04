import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { KafkaEventEnvelope, OrderCreatedEventData, OrderStatusChangedEventData, PaymentEventData } from '../interfaces/kafka-event.interface';
import { KAFKA_EVENT_TYPES } from '../kafka.constants';
import { NotificationType } from '@ecommerce/database';

@Injectable()
export class OrderEventsConsumer {
  private readonly logger = new Logger(OrderEventsConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleEvent(envelope: KafkaEventEnvelope): Promise<void> {
    const { eventType, eventId, correlationId, data } = envelope;
    this.logger.log(`[OrderEventsConsumer] Processing event '${eventType}' (eventId: ${eventId}, correlationId: ${correlationId})`);

    switch (eventType) {
      case KAFKA_EVENT_TYPES.ORDER_CREATED:
        await this.handleOrderCreated(data as OrderCreatedEventData, correlationId);
        break;

      case KAFKA_EVENT_TYPES.ORDER_CONFIRMED:
      case KAFKA_EVENT_TYPES.ORDER_SHIPPED:
      case KAFKA_EVENT_TYPES.ORDER_DELIVERED:
      case KAFKA_EVENT_TYPES.ORDER_CANCELLED:
        await this.handleOrderStatusChanged(data as OrderStatusChangedEventData);
        break;

      case KAFKA_EVENT_TYPES.PAYMENT_SUCCEEDED:
        await this.handlePaymentSucceeded(data as PaymentEventData);
        break;

      default:
        this.logger.debug(`[OrderEventsConsumer] Unhandled eventType: ${eventType}`);
    }
  }

  private async handleOrderCreated(data: OrderCreatedEventData, correlationId?: string): Promise<void> {
    if (!data.orderId || !data.userId) return;

    try {
      await this.notificationsService.sendNotification({
        userId: data.userId,
        type: NotificationType.ORDER_CREATED,
        title: `Order Placed: ${data.orderNumber}`,
        message: `Your order #${data.orderNumber} for ₹${data.totalAmount} has been placed successfully.`,
        link: `/orders/${data.orderId}`,
      });
      this.logger.log(`Dispatched async order created notification for order ${data.orderNumber}`);
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch order notification for ${data.orderNumber}: ${err.message}`);
    }
  }

  private async handleOrderStatusChanged(data: OrderStatusChangedEventData): Promise<void> {
    this.logger.log(`Order ${data.orderNumber} transitioned to ${data.newStatus}`);
  }

  private async handlePaymentSucceeded(data: PaymentEventData): Promise<void> {
    this.logger.log(`Payment confirmed for order ${data.orderNumber}, amount: ₹${data.amount}`);
  }
}
