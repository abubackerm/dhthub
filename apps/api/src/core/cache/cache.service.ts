import { Injectable, Inject, Logger, Optional, OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {}

  onModuleInit() {
    if (this.redisClient) {
      this.logger.log('Cache store initialized (Redis client available)');
    } else {
      this.logger.warn(
        'Cache store initialized without Redis — caching is disabled. Set REDIS_HOST to enable.',
      );
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.redisClient) return undefined;

    try {
      const raw = await this.redisClient.get(key);
      if (raw !== null) {
        this.logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(raw) as T;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return undefined;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get cache key "${key}": ${errorMessage}`);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.redisClient) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.setex(key, ttl, serialized);
      } else {
        await this.redisClient.set(key, serialized);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to set cache key "${key}": ${errorMessage}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      await this.redisClient.del(key);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to delete cache key "${key}": ${errorMessage}`);
    }
  }

  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0 || !this.redisClient) return 0;

    try {
      return await this.redisClient.del(...keys);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to delete ${keys.length} cache keys: ${errorMessage}`);
      return 0;
    }
  }

  async delPattern(pattern: string, chunkSize = 100): Promise<number> {
    if (!this.redisClient) return 0;

    let totalDeleted = 0;
    const stream = this.redisClient.scanStream({
      match: pattern,
      count: chunkSize,
    });
    let chunk: string[] = [];

    const flushChunk = async (keys: string[]) => {
      if (keys.length === 0) return;
      const pipeline = this.redisClient!.pipeline();
      for (const key of keys) {
        pipeline.unlink(key);
      }
      const results = await pipeline.exec();
      for (const [err, result] of results ?? []) {
        if (!err && (result as number) > 0) totalDeleted++;
      }
    };

    await new Promise<void>((resolve) => {
      stream.on('data', async (resultKeys: string[]) => {
        chunk.push(...resultKeys);
        if (chunk.length >= chunkSize) {
          stream.pause();
          try {
            await flushChunk(chunk);
            chunk = [];
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(
              `delPattern flush error for "${pattern}": ${errorMessage}`,
            );
          }
          stream.resume();
        }
      });

      stream.on('end', async () => {
        if (chunk.length > 0) {
          try {
            await flushChunk(chunk);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(
              `delPattern final flush error for "${pattern}": ${errorMessage}`,
            );
          }
        }
        resolve();
      });

      stream.on('error', (error: Error) => {
        this.logger.warn(
          `delPattern scan error for "${pattern}": ${error.message}`,
        );
        resolve();
      });
    });

    this.logger.log(`delPattern("${pattern}"): ${totalDeleted} key(s) deleted from Redis`);
    return totalDeleted;
  }

  async reset(): Promise<void> {
    if (!this.redisClient) return;

    try {
      await this.redisClient.flushdb();
      this.logger.log('Cache reset: all keys flushed from Redis');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to reset cache: ${errorMessage}`);
    }
  }

  async wrap<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    this.logger.debug(`Cache MISS (wrap): ${key} — calling factory`);
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}
