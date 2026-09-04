import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel, SASLOptions } from 'kafkajs';
import { KafkaEventEnvelope } from '../interfaces/kafka-event.interface';
import { KAFKA_HEADERS, KafkaTopicName } from '../kafka.constants';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('kafka.enabled', false);
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Kafka Producer is disabled by configuration (KAFKA_ENABLED=false).');
      return;
    }

    try {
      await this.initKafka();
      await this.connect();
    } catch (err: any) {
      this.logger.warn(`Failed to connect Kafka Producer during startup: ${err.message}. System will continue with transactional outbox.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async initKafka(): Promise<void> {
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

    this.logger.log(`Initializing KafkaJS Producer for brokers: [${brokers.join(', ')}], SSL: ${ssl}, SASL: ${!!sasl}`);

    this.kafka = new Kafka({
      clientId,
      brokers,
      ssl,
      sasl,
      connectionTimeout,
      requestTimeout,
      logLevel: logLevel.NOTHING, // Avoid noisy or sensitive internal connection logs
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false, // STRICT CONSTRAINT: never create new topics
      idempotent: true, // Kafka producer idempotency
      maxInFlightRequests: 5,
    });
  }

  async connect(): Promise<void> {
    if (!this.producer || this.isConnected) return;
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka Producer connected successfully to cluster.');
    } catch (error: any) {
      this.isConnected = false;
      this.logger.error(`Kafka Producer connection failed: ${error.message}`);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      try {
        this.logger.log('Disconnecting Kafka Producer gracefully...');
        await this.producer.disconnect();
        this.isConnected = false;
        this.logger.log('Kafka Producer disconnected.');
      } catch (error: any) {
        this.logger.error(`Error disconnecting Kafka Producer: ${error.message}`);
      }
    }
  }

  async sendEvent<T>(
    topic: KafkaTopicName | string,
    partitionKey: string,
    event: KafkaEventEnvelope<T>,
  ): Promise<{ topic: string; partitionKey: string; eventId: string }> {
    if (!this.isEnabled) {
      this.logger.debug(`[Kafka Mock/Disabled] Skipping produce to ${topic} for key=${partitionKey}`);
      return { topic, partitionKey, eventId: event.eventId };
    }

    if (!this.producer || !this.isConnected) {
      await this.connect();
    }

    if (!this.producer) {
      throw new Error('Kafka Producer is not initialized');
    }

    const payloadString = JSON.stringify(event);
    const headers: Record<string, string> = {
      [KAFKA_HEADERS.EVENT_ID]: event.eventId,
      [KAFKA_HEADERS.EVENT_TYPE]: event.eventType,
      [KAFKA_HEADERS.PRODUCER]: event.producer || 'ecommerce-api',
      [KAFKA_HEADERS.TIMESTAMP]: event.occurredAt || new Date().toISOString(),
    };

    if (event.correlationId) {
      headers[KAFKA_HEADERS.CORRELATION_ID] = event.correlationId;
    }

    const startTime = Date.now();
    await this.producer.send({
      topic,
      messages: [
        {
          key: partitionKey,
          value: payloadString,
          headers,
        },
      ],
    });

    const elapsedMs = Date.now() - startTime;
    this.logger.log(
      `Published [${event.eventType}] to topic '${topic}' (key: ${partitionKey}, eventId: ${event.eventId}, duration: ${elapsedMs}ms)`,
    );

    return { topic, partitionKey, eventId: event.eventId };
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}
