import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, logLevel, SASLOptions, EachMessagePayload } from 'kafkajs';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OrderEventsConsumer } from '../consumers/order-events.consumer';
import { InventoryEventsConsumer } from '../consumers/inventory-events.consumer';
import { ShipmentEventsConsumer } from '../consumers/shipment-events.consumer';
import { KafkaEventEnvelope } from '../interfaces/kafka-event.interface';
import { KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS } from '../kafka.constants';

@Injectable()
export class KafkaConsumerManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerManagerService.name);
  private kafka: Kafka | null = null;
  private consumers: Consumer[] = [];
  private isRunning = false;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly orderConsumer: OrderEventsConsumer,
    private readonly inventoryConsumer: InventoryEventsConsumer,
    private readonly shipmentConsumer: ShipmentEventsConsumer,
  ) {
    this.isEnabled = this.configService.get<boolean>('kafka.enabled', false);
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Kafka Consumer Manager is disabled (KAFKA_ENABLED=false).');
      return;
    }

    try {
      await this.initConsumers();
    } catch (err: any) {
      this.logger.warn(`Failed to initialize Kafka consumers: ${err.message}. Background consumers will be inactive.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnectAll();
  }

  private async initConsumers(): Promise<void> {
    const brokers = this.configService.get<string[]>('kafka.brokers', ['localhost:9092']);
    const clientId = this.configService.get<string>('kafka.clientId', 'ecommerce-api');
    const username = this.configService.get<string>('kafka.username');
    const password = this.configService.get<string>('kafka.password');
    const ssl = this.configService.get<boolean>('kafka.ssl', false);
    const saslMechanism = this.configService.get<'scram-sha-256' | 'plain'>('kafka.saslMechanism', 'scram-sha-256');
    const connectionTimeout = this.configService.get<number>('kafka.connectionTimeout', 10000);
    const requestTimeout = this.configService.get<number>('kafka.requestTimeout', 30000);

    let sasl: SASLOptions | undefined = undefined;
    if (username && password) {
      sasl = {
        mechanism: saslMechanism,
        username,
        password,
      };
    }

    this.kafka = new Kafka({
      clientId: `${clientId}-consumer`,
      brokers,
      ssl,
      sasl,
      connectionTimeout,
      requestTimeout,
      logLevel: logLevel.NOTHING,
    });

    // 1. Setup Order Events Worker (ecommerce.order.events & ecommerce.order.created)
    await this.startConsumerGroup(
      KAFKA_CONSUMER_GROUPS.ORDER_WORKER,
      [KAFKA_TOPICS.ORDER_EVENTS, KAFKA_TOPICS.ORDER_CREATED],
      async (envelope) => this.orderConsumer.handleEvent(envelope),
    );

    // 2. Setup Inventory Events Worker (ecommerce.inventory.events)
    await this.startConsumerGroup(
      KAFKA_CONSUMER_GROUPS.INVENTORY_WORKER,
      [KAFKA_TOPICS.INVENTORY_EVENTS],
      async (envelope) => this.inventoryConsumer.handleEvent(envelope),
    );

    // 3. Setup Shipment & Courier Events Worker (ecommerce.shipment.events & courier.shipment.events)
    await this.startConsumerGroup(
      KAFKA_CONSUMER_GROUPS.SHIPMENT_WORKER,
      [KAFKA_TOPICS.SHIPMENT_EVENTS, KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS],
      async (envelope) => this.shipmentConsumer.handleEvent(envelope),
    );

    this.isRunning = true;
    this.logger.log('All 3 Kafka Consumer Groups initialized and listening.');
  }

  private async startConsumerGroup(
    groupId: string,
    topics: string[],
    handler: (envelope: KafkaEventEnvelope) => Promise<void>,
  ): Promise<void> {
    if (!this.kafka) return;

    const consumer = this.kafka.consumer({
      groupId,
      allowAutoTopicCreation: false, // Strict: never auto-create topics
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await consumer.connect();

    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
      this.logger.log(`Consumer group '${groupId}' subscribed to topic '${topic}'`);
    }

    await consumer.run({
      autoCommit: true,
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessageWithIdempotency(groupId, payload, handler);
      },
    });

    this.consumers.push(consumer);
  }

  async processMessageWithIdempotency(
    consumerGroup: string,
    payload: EachMessagePayload,
    handler: (envelope: KafkaEventEnvelope) => Promise<void>,
  ): Promise<void> {
    const { topic, partition, message } = payload;
    const valueString = message.value?.toString();
    if (!valueString) return;

    let envelope: KafkaEventEnvelope;
    try {
      envelope = JSON.parse(valueString) as KafkaEventEnvelope;
    } catch (parseErr: any) {
      this.logger.error(`Failed to parse JSON message from topic ${topic}: ${parseErr.message}`);
      return;
    }

    const eventId = envelope.eventId || `${topic}-${partition}-${message.offset}`;
    const redisKey = `kafka_inbox:${consumerGroup}:${eventId}`;

    // 1. Idempotency Check via Redis Fast Cache
    const inRedis = await this.redisService.get(redisKey);
    if (inRedis) {
      this.logger.debug(`[Idempotency] Duplicate event ${eventId} in topic ${topic} skipped via Redis.`);
      return;
    }

    // 2. Idempotency Check via PostgreSQL Inbox Table
    try {
      const existing = await this.prisma.kafkaInboxEvent.findUnique({
        where: { eventId },
      });
      if (existing) {
        await this.redisService.set(redisKey, '1', 86400); // 24hr TTL cache
        this.logger.debug(`[Idempotency] Duplicate event ${eventId} in topic ${topic} skipped via DB Inbox.`);
        return;
      }
    } catch (dbErr: any) {
      this.logger.warn(`Inbox DB check warning for ${eventId}: ${dbErr.message}`);
    }

    // 3. Process with Retry Mechanism
    const maxRetries = 3;
    let attempt = 0;
    let success = false;
    let lastError: any = null;

    while (attempt < maxRetries && !success) {
      attempt++;
      try {
        await handler(envelope);
        success = true;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Error processing event ${eventId} (attempt ${attempt}/${maxRetries}): ${err.message}`,
        );
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 500;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (success) {
      // Record in PostgreSQL Inbox
      try {
        await this.prisma.kafkaInboxEvent.create({
          data: {
            eventId,
            eventType: envelope.eventType || 'unknown',
            topic,
            consumerGroup,
            status: 'PROCESSED',
          },
        });
        await this.redisService.set(redisKey, '1', 86400);
      } catch (inboxErr: any) {
        this.logger.warn(`Could not record inbox event for ${eventId}: ${inboxErr.message}`);
      }
    } else {
      // Durable PostgreSQL DLQ Storage (because no additional Kafka topics can be created)
      this.logger.error(
        `[DLQ Persist] Event ${eventId} failed all ${maxRetries} attempts. Persisting to PostgreSQL KafkaFailedEvent.`,
      );
      try {
        await this.prisma.kafkaFailedEvent.create({
          data: {
            eventId,
            topic,
            consumerGroup,
            partition,
            offset: message.offset,
            payload: envelope as any,
            errorMessage: lastError?.message || 'Unknown processing failure',
            stackTrace: lastError?.stack || null,
            retryCount: maxRetries,
          },
        });
      } catch (dlqErr: any) {
        this.logger.error(`CRITICAL: Failed to write event to KafkaFailedEvent table: ${dlqErr.message}`);
      }
    }
  }

  async disconnectAll(): Promise<void> {
    if (this.consumers.length > 0) {
      this.logger.log(`Disconnecting ${this.consumers.length} Kafka consumers gracefully...`);
      for (const consumer of this.consumers) {
        try {
          await consumer.disconnect();
        } catch (err: any) {
          this.logger.error(`Error disconnecting consumer: ${err.message}`);
        }
      }
      this.consumers = [];
      this.isRunning = false;
      this.logger.log('All Kafka consumers disconnected.');
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}
