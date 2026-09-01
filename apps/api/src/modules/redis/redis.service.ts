import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private ioClient: Redis | null = null;
  private upstashClient: UpstashRedis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private memoryFallback = new Map<string, { val: string; expiresAt?: number }>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const upstashUrl = this.configService.get<string>('upstash.restUrl') || process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = this.configService.get<string>('upstash.restToken') || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        this.upstashClient = new UpstashRedis({
          url: upstashUrl,
          token: upstashToken,
        });
        this.logger.log(`Initialized Upstash HTTP Redis client (${upstashUrl})`);
        return;
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Upstash Redis: ${err.message}`);
      }
    }

    const redisUrl = this.configService.get<string>('redis.url') || process.env.REDIS_URL;
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    const useTls = this.configService.get<boolean>('redis.tls', false);

    try {
      if (redisUrl) {
        this.ioClient = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
          tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        });
      } else {
        this.ioClient = new Redis({
          host,
          port,
          password,
          tls: useTls ? {} : undefined,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        });
      }

      this.ioClient.connect().catch((err) => {
        this.logger.warn(`Redis connection failed (${err.message}). Using in-memory fallback.`);
        this.ioClient = null;
      });

      this.ioClient.on('connect', () => {
        this.logger.log('Connected to Redis TCP server.');
      });
    } catch (e: any) {
      this.logger.warn(`Redis initialization skipped: ${e.message}`);
      this.ioClient = null;
    }
  }

  onModuleDestroy() {
    if (this.ioClient) {
      this.ioClient.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.upstashClient) {
      try {
        const result = await this.upstashClient.get<string>(key);
        if (result !== null && result !== undefined) {
          return typeof result === 'object' ? JSON.stringify(result) : String(result);
        }
        return null;
      } catch (e: any) {
        this.logger.warn(`Upstash get error: ${e.message}`);
      }
    }

    if (this.ioClient) {
      try {
        return await this.ioClient.get(key);
      } catch {
        // fallback
      }
    }

    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return item.val;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.upstashClient) {
      try {
        if (ttlSeconds) {
          await this.upstashClient.set(key, value, { ex: ttlSeconds });
        } else {
          await this.upstashClient.set(key, value);
        }
        return;
      } catch (e: any) {
        this.logger.warn(`Upstash set error: ${e.message}`);
      }
    }

    if (this.ioClient) {
      try {
        if (ttlSeconds) {
          await this.ioClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.ioClient.set(key, value);
        }
        return;
      } catch {
        // fallback
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryFallback.set(key, { val: value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.upstashClient) {
      try {
        await this.upstashClient.del(key);
        return;
      } catch (e: any) {
        this.logger.warn(`Upstash del error: ${e.message}`);
      }
    }

    if (this.ioClient) {
      try {
        await this.ioClient.del(key);
        return;
      } catch {
        // fallback
      }
    }

    this.memoryFallback.delete(key);
  }
}
