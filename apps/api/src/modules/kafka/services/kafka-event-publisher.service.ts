import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { KafkaProducerService } from './kafka-producer.service';
import {
  KafkaEventEnvelope,
  OrderCreatedEventData,
  OrderStatusChangedEventData,
  PaymentEventData,
  ReturnEventData,
  RefundEventData,
  InventoryEventData,
  ShipmentEventData,
  CourierEventData,
} from '../interfaces/kafka-event.interface';
import {
  KAFKA_TOPICS,
  KAFKA_EVENT_TYPES,
  KafkaTopicName,
  KafkaEventTypeName,
} from '../kafka.constants';
import { OutboxStatus } from '@ecommerce/database';

export interface PublishOutboxOptions<T = any> {
  topic: KafkaTopicName | string;
  partitionKey: string;
  eventType: KafkaEventTypeName | string;
  aggregateType: string;
  aggregateId: string;
  data: T;
  correlationId?: string;
}

@Injectable()
export class KafkaEventPublisher {
  private readonly logger = new Logger(KafkaEventPublisher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly producerService: KafkaProducerService,
  ) {}

  buildEnvelope<T>(
    eventType: KafkaEventTypeName | string,
    aggregateType: string,
    aggregateId: string,
    data: T,
    correlationId?: string,
  ): KafkaEventEnvelope<T> {
    return {
      eventId: randomUUID(),
      eventType,
      version: 1,
      occurredAt: new Date().toISOString(),
      producer: 'ecommerce-api',
      correlationId: correlationId || randomUUID(),
      aggregateType,
      aggregateId,
      data,
    };
  }

  // =========================================================================
  // 1. TRANSACTIONAL OUTBOX INSERTION (Inside ongoing Prisma Transaction)
  // =========================================================================

  async createOutboxEvent<T>(
    tx: any,
    options: PublishOutboxOptions<T>,
  ): Promise<any> {
    const envelope = this.buildEnvelope(
      options.eventType,
      options.aggregateType,
      options.aggregateId,
      options.data,
      options.correlationId,
    );

    const prismaClient = tx || this.prisma;
    return prismaClient.outboxEvent.create({
      data: {
        topic: options.topic,
        partitionKey: options.partitionKey,
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        aggregateType: envelope.aggregateType,
        aggregateId: envelope.aggregateId,
        correlationId: envelope.correlationId,
        payload: envelope as any,
        status: OutboxStatus.PENDING,
      },
    });
  }

  // =========================================================================
  // 2. DIRECT PUBLISH (Outside Transactions or Direct Stream Pipeline)
  // =========================================================================

  async publishDirect<T>(
    topic: KafkaTopicName | string,
    partitionKey: string,
    envelope: KafkaEventEnvelope<T>,
  ): Promise<void> {
    try {
      await this.producerService.sendEvent(topic, partitionKey, envelope);
    } catch (err: any) {
      this.logger.error(
        `Direct Kafka publish failed for topic ${topic}, key ${partitionKey}: ${err.message}`,
      );
      // Failover: persist to Outbox so it is picked up by OutboxProcessor
      try {
        await this.prisma.outboxEvent.create({
          data: {
            topic,
            partitionKey,
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            aggregateType: envelope.aggregateType,
            aggregateId: envelope.aggregateId,
            correlationId: envelope.correlationId,
            payload: envelope as any,
            status: OutboxStatus.PENDING,
            lastError: `Direct publish fallback: ${err.message}`,
          },
        });
      } catch (dbErr: any) {
        this.logger.error(`Failed to store fallback outbox event: ${dbErr.message}`);
      }
    }
  }

  // =========================================================================
  // 3. DOMAIN EVENT HELPER METHODS
  // =========================================================================

  async publishOrderCreated(
    tx: any,
    data: OrderCreatedEventData,
    correlationId?: string,
  ): Promise<void> {
    // 1. Publish to main ecommerce.order.events
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.ORDER_EVENTS,
      partitionKey: data.orderId,
      eventType: KAFKA_EVENT_TYPES.ORDER_CREATED,
      aggregateType: 'Order',
      aggregateId: data.orderId,
      data,
      correlationId,
    });

    // 2. Publish to dedicated legacy/special topic ecommerce.order.created
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.ORDER_CREATED,
      partitionKey: data.orderId,
      eventType: KAFKA_EVENT_TYPES.ORDER_CREATED,
      aggregateType: 'Order',
      aggregateId: data.orderId,
      data,
      correlationId,
    });
  }

  async publishOrderStatusChanged(
    tx: any,
    data: OrderStatusChangedEventData,
    correlationId?: string,
  ): Promise<void> {
    const eventType =
      data.newStatus === 'CONFIRMED'
        ? KAFKA_EVENT_TYPES.ORDER_CONFIRMED
        : data.newStatus === 'PROCESSING'
          ? KAFKA_EVENT_TYPES.ORDER_PROCESSING
          : data.newStatus === 'PACKED'
            ? KAFKA_EVENT_TYPES.ORDER_PACKED
            : data.newStatus === 'SHIPPED'
              ? KAFKA_EVENT_TYPES.ORDER_SHIPPED
              : data.newStatus === 'OUT_FOR_DELIVERY'
                ? KAFKA_EVENT_TYPES.ORDER_OUT_FOR_DELIVERY
                : data.newStatus === 'DELIVERED'
                  ? KAFKA_EVENT_TYPES.ORDER_DELIVERED
                  : data.newStatus === 'CANCELLED'
                    ? KAFKA_EVENT_TYPES.ORDER_CANCELLED
                    : `order.status_${data.newStatus.toLowerCase()}`;

    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.ORDER_EVENTS,
      partitionKey: data.orderId,
      eventType,
      aggregateType: 'Order',
      aggregateId: data.orderId,
      data,
      correlationId,
    });
  }

  async publishPaymentEvent(
    tx: any,
    eventType: KafkaEventTypeName | string,
    data: PaymentEventData,
    correlationId?: string,
  ): Promise<void> {
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.ORDER_EVENTS,
      partitionKey: data.orderId,
      eventType,
      aggregateType: 'Payment',
      aggregateId: data.orderId,
      data,
      correlationId,
    });
  }

  async publishReturnEvent(
    tx: any,
    eventType: KafkaEventTypeName | string,
    data: ReturnEventData,
    correlationId?: string,
  ): Promise<void> {
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.ORDER_EVENTS,
      partitionKey: data.orderId,
      eventType,
      aggregateType: 'ReturnRequest',
      aggregateId: data.returnRequestId,
      data,
      correlationId,
    });
  }

  async publishRefundEvent(
    tx: any,
    eventType: KafkaEventTypeName | string,
    data: RefundEventData,
    correlationId?: string,
  ): Promise<void> {
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.ORDER_EVENTS,
      partitionKey: data.orderId,
      eventType,
      aggregateType: 'Refund',
      aggregateId: data.refundId,
      data,
      correlationId,
    });
  }

  async publishInventoryEvent(
    tx: any,
    eventType: KafkaEventTypeName | string,
    data: InventoryEventData,
    correlationId?: string,
  ): Promise<void> {
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.INVENTORY_EVENTS,
      partitionKey: data.variantId,
      eventType,
      aggregateType: 'Inventory',
      aggregateId: data.variantId,
      data,
      correlationId,
    });
  }

  async publishShipmentEvent(
    tx: any,
    eventType: KafkaEventTypeName | string,
    data: ShipmentEventData,
    correlationId?: string,
  ): Promise<void> {
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.SHIPMENT_EVENTS,
      partitionKey: data.shipmentId,
      eventType,
      aggregateType: 'Shipment',
      aggregateId: data.shipmentId,
      data,
      correlationId,
    });
  }

  async publishCourierEvent(
    tx: any,
    eventType: KafkaEventTypeName | string,
    data: CourierEventData,
    correlationId?: string,
  ): Promise<void> {
    await this.createOutboxEvent(tx, {
      topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
      partitionKey: data.awbNumber || data.orderNumber || randomUUID(),
      eventType,
      aggregateType: 'CourierShipment',
      aggregateId: data.awbNumber,
      data,
      correlationId,
    });
  }
}
