import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ShippingService } from '../../shipping/shipping.service';
import { KafkaEventEnvelope, ShipmentEventData, CourierEventData } from '../interfaces/kafka-event.interface';
import { KAFKA_EVENT_TYPES } from '../kafka.constants';

@Injectable()
export class ShipmentEventsConsumer {
  private readonly logger = new Logger(ShipmentEventsConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly shippingService: ShippingService,
  ) {}

  async handleEvent(envelope: KafkaEventEnvelope): Promise<void> {
    const { eventType, eventId, correlationId, data } = envelope;
    this.logger.log(`[ShipmentEventsConsumer] Processing event '${eventType}' (eventId: ${eventId}, correlationId: ${correlationId})`);

    switch (eventType) {
      case KAFKA_EVENT_TYPES.SHIPMENT_REQUESTED:
        await this.handleShipmentRequested(data as ShipmentEventData, correlationId);
        break;

      case KAFKA_EVENT_TYPES.SHIPMENT_CREATED:
      case KAFKA_EVENT_TYPES.SHIPMENT_DELIVERED:
      case KAFKA_EVENT_TYPES.SHIPMENT_CANCELLED:
        this.logger.log(`Shipment ${ (data as ShipmentEventData).shipmentId } status updated: ${eventType}`);
        break;

      case KAFKA_EVENT_TYPES.COURIER_SHIPMENT_CREATED:
      case KAFKA_EVENT_TYPES.COURIER_IN_TRANSIT:
      case KAFKA_EVENT_TYPES.COURIER_OUT_FOR_DELIVERY:
      case KAFKA_EVENT_TYPES.COURIER_DELIVERED:
      case KAFKA_EVENT_TYPES.COURIER_CANCELLED:
        await this.handleCourierMilestone(data as CourierEventData);
        break;

      default:
        this.logger.debug(`[ShipmentEventsConsumer] Unhandled eventType: ${eventType}`);
    }
  }

  private async handleShipmentRequested(data: ShipmentEventData, correlationId?: string): Promise<void> {
    const orderNumber = data.orderNumber;
    if (!orderNumber || !data.orderId) return;

    // Strict Idempotency Check: reuse existing courier-shipment:<orderNumber> key
    const idempotencyKey = `courier-shipment:${orderNumber}`;
    const isProcessingOrCompleted = await this.redisService.get(idempotencyKey);
    if (isProcessingOrCompleted) {
      this.logger.log(`Skipping duplicate async shipment creation for order ${orderNumber} (Idempotency matched)`);
      return;
    }

    try {
      // Check if shipment record already exists
      const existing = await this.prisma.shipment.findUnique({
        where: { orderId: data.orderId },
      });

      if (existing) {
        this.logger.log(`Shipment record already exists for order ${orderNumber}, awb: ${existing.awbNumber || 'PENDING'}`);
        return;
      }

      // Mark lock with 1 hour TTL
      await this.redisService.set(idempotencyKey, 'PROCESSED_KAFKA_WORKER', 3600);

      // Trigger shipment creation via ShippingService (Admin context)
      await this.shippingService.createShipment(
        'SYSTEM_KAFKA_WORKER',
        'ADMIN',
        {
          orderId: data.orderId,
          courierProvider: data.courierProvider || 'STANDARD_EXPRESS',
          weightKg: data.weight || 1.5,
        },
      );
      this.logger.log(`Async shipment created successfully for order ${orderNumber}`);
    } catch (err: any) {
      this.logger.warn(`Failed async shipment creation for order ${orderNumber}: ${err.message}`);
    }
  }

  private async handleCourierMilestone(data: CourierEventData): Promise<void> {
    this.logger.log(`Courier milestone received for AWB '${data.awbNumber}': ${data.status} (Location: ${data.location || 'N/A'})`);
  }
}
