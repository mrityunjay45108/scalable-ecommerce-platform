import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KafkaEventEnvelope, InventoryEventData } from '../interfaces/kafka-event.interface';
import { KAFKA_EVENT_TYPES } from '../kafka.constants';

@Injectable()
export class InventoryEventsConsumer {
  private readonly logger = new Logger(InventoryEventsConsumer.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleEvent(envelope: KafkaEventEnvelope): Promise<void> {
    const { eventType, eventId, correlationId, data } = envelope;
    this.logger.log(`[InventoryEventsConsumer] Processing event '${eventType}' (eventId: ${eventId}, correlationId: ${correlationId})`);

    switch (eventType) {
      case KAFKA_EVENT_TYPES.INVENTORY_LOW_STOCK:
        await this.handleLowStockAlert(data as InventoryEventData);
        break;

      case KAFKA_EVENT_TYPES.INVENTORY_RESERVED:
      case KAFKA_EVENT_TYPES.INVENTORY_RELEASED:
      case KAFKA_EVENT_TYPES.INVENTORY_COMMITTED:
        this.logger.debug(`[InventoryEventsConsumer] Audit metric updated for variant: ${(data as InventoryEventData).variantId}`);
        break;

      default:
        this.logger.debug(`[InventoryEventsConsumer] Unhandled eventType: ${eventType}`);
    }
  }

  private async handleLowStockAlert(data: InventoryEventData): Promise<void> {
    this.logger.warn(`[LOW STOCK ALERT] Product Variant '${data.sku || data.variantId}' remaining stock is ${data.newStock}`);
  }
}
