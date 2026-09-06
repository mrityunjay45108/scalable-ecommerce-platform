import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ShippingService } from '../../shipping/shipping.service';
import { CourierStatusMappingService } from '../../shipping/courier-status-mapping.service';
import { KafkaEventEnvelope, ShipmentEventData, CourierEventData } from '../interfaces/kafka-event.interface';
import { KAFKA_EVENT_TYPES } from '../kafka.constants';

@Injectable()
export class ShipmentEventsConsumer {
  private readonly logger = new Logger(ShipmentEventsConsumer.name);
  private readonly statusMappingService: CourierStatusMappingService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly shippingService: ShippingService,
    @Optional() statusMappingService?: CourierStatusMappingService,
  ) {
    this.statusMappingService = statusMappingService || new CourierStatusMappingService();
  }

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
    const awb = data.awbNumber;
    this.logger.log(`Courier milestone received for AWB '${awb}': ${data.status} (Location: ${data.location || 'N/A'})`);

    if (!awb && !data.orderNumber) {
      this.logger.warn('[ShipmentEventsConsumer] Milestone missing both AWB and orderNumber');
      return;
    }

    try {
      // 1. Locate shipment by AWB or orderNumber
      const shipment = await this.prisma.shipment.findFirst({
        where: {
          OR: [
            ...(awb ? [{ awbNumber: awb }] : []),
            ...(data.orderNumber ? [{ order: { orderNumber: data.orderNumber } }] : []),
          ],
        },
        include: { order: true },
      });

      if (!shipment) {
        this.logger.warn(`No shipment found matching AWB '${awb}' or Order '${data.orderNumber}'`);
        return;
      }

      // 2. Map courier status to ShipmentStatus enum
      const targetStatus = this.statusMappingService.mapCourierToShipmentStatus(data.status);

      // Skip duplicate transition
      if (shipment.status === targetStatus) {
        this.logger.log(`Shipment ${shipment.id} is already in status ${targetStatus}. Skipping duplicate transition.`);
        return;
      }

      // 3. Atomically synchronize shipment status and order lifecycle
      await this.shippingService.updateShipmentStatus(
        shipment.id,
        {
          status: targetStatus,
          location: data.location || 'Central Logistics Hub',
          activity: data.activity || `Courier milestone update: ${data.status}`,
        },
        'SYSTEM_KAFKA_WORKER',
      );

      this.logger.log(`Shipment ${shipment.id} (AWB: ${awb}) successfully synced to ${targetStatus}`);
    } catch (err: any) {
      this.logger.error(`Failed processing courier milestone for AWB '${awb}': ${err.message}`);
    }
  }
}
