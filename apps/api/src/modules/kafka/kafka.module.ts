import { Module, Global, forwardRef } from '@nestjs/common';
import { KafkaProducerService } from './services/kafka-producer.service';
import { KafkaEventPublisher } from './services/kafka-event-publisher.service';
import { OutboxProcessorService } from './services/outbox-processor.service';
import { KafkaConsumerManagerService } from './services/kafka-consumer-manager.service';
import { OrderEventsConsumer } from './consumers/order-events.consumer';
import { InventoryEventsConsumer } from './consumers/inventory-events.consumer';
import { ShipmentEventsConsumer } from './consumers/shipment-events.consumer';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShippingModule } from '../shipping/shipping.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificationsModule,
    forwardRef(() => ShippingModule),
  ],
  providers: [
    KafkaProducerService,
    KafkaEventPublisher,
    OutboxProcessorService,
    KafkaConsumerManagerService,
    OrderEventsConsumer,
    InventoryEventsConsumer,
    ShipmentEventsConsumer,
  ],
  exports: [
    KafkaProducerService,
    KafkaEventPublisher,
    OutboxProcessorService,
    KafkaConsumerManagerService,
    OrderEventsConsumer,
    InventoryEventsConsumer,
    ShipmentEventsConsumer,
  ],
})
export class KafkaModule {}
