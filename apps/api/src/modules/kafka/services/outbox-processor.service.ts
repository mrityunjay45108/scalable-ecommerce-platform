import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { KafkaProducerService } from './kafka-producer.service';
import { OutboxStatus } from '@ecommerce/database';
import { KafkaEventEnvelope } from '../interfaces/kafka-event.interface';

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly isEnabled: boolean;
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly producerService: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get<boolean>('kafka.enabled', false);
    this.batchSize = this.configService.get<number>('kafka.outbox.batchSize', 50);
    this.pollIntervalMs = this.configService.get<number>('kafka.outbox.pollIntervalMs', 2000);
    this.maxRetries = this.configService.get<number>('kafka.outbox.maxRetries', 5);
  }

  onModuleInit(): void {
    if (!this.isEnabled) {
      this.logger.log('OutboxProcessorService is idle because Kafka is disabled (KAFKA_ENABLED=false).');
      return;
    }

    this.logger.log(`Starting OutboxProcessorService (Poll interval: ${this.pollIntervalMs}ms, Batch size: ${this.batchSize})`);
    this.timer = setInterval(() => {
      this.processPendingEvents().catch((err) => {
        this.logger.error(`Error in outbox background loop: ${err.message}`);
      });
    }, this.pollIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('OutboxProcessorService stopped.');
    }
  }

  async processPendingEvents(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: {
          status: OutboxStatus.PENDING,
          scheduledFor: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
        take: this.batchSize,
      });

      if (pendingEvents.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      processed = pendingEvents.length;

      for (const event of pendingEvents) {
        try {
          const envelope = event.payload as unknown as KafkaEventEnvelope;
          await this.producerService.sendEvent(
            event.topic,
            event.partitionKey,
            envelope,
          );

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: OutboxStatus.PUBLISHED,
              publishedAt: new Date(),
              lastError: null,
            },
          });
          succeeded++;
        } catch (err: any) {
          failed++;
          const nextRetry = event.retryCount + 1;
          const isFinalFailure = nextRetry >= this.maxRetries;
          const backoffSeconds = Math.min(300, Math.pow(2, nextRetry) * 2);
          const nextSchedule = new Date(Date.now() + backoffSeconds * 1000);

          this.logger.warn(
            `Outbox event ${event.id} (topic: ${event.topic}, attempt: ${nextRetry}/${this.maxRetries}) failed to publish: ${err.message}. Next attempt at: ${nextSchedule.toISOString()}`,
          );

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: isFinalFailure ? OutboxStatus.FAILED : OutboxStatus.PENDING,
              retryCount: nextRetry,
              lastError: err.message || 'Unknown Kafka publish failure',
              scheduledFor: isFinalFailure ? event.scheduledFor : nextSchedule,
            },
          });
        }
      }
    } catch (dbError: any) {
      this.logger.error(`Database error while processing outbox events: ${dbError.message}`);
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded, failed };
  }
}
