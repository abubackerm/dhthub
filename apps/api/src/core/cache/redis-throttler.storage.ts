import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import {
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './cache.service';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {}

  private get isAvailable(): boolean {
    return this.redisClient !== undefined;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    const blockKey = `${key}:blocked`;

    if (!this.isAvailable) {
      return this.inMemoryFallback(key, ttlSeconds, limit, blockDuration);
    }

    try {
      const multi = this.redisClient!.multi();

      multi.incr(key);
      multi.pttl(key);
      multi.exists(blockKey);
      multi.pttl(blockKey);

      const results = await multi.exec();
      const hits = results![0][1] as number;
      const remainingTtlMs = results![1][1] as number;
      const isBlocked = (results![2][1] as number) === 1;
      const blockRemainingMs = results![3][1] as number;

      if (hits === 1) {
        await this.redisClient!.pexpire(key, ttl);
      }

      const timeToExpire = Math.max(
        0,
        Math.ceil((remainingTtlMs > 0 ? remainingTtlMs : ttl) / 1000),
      );

      if (isBlocked) {
        return {
          totalHits: hits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: Math.max(0, Math.ceil(blockRemainingMs / 1000)),
        };
      }

      if (hits > limit) {
        const blockSeconds = Math.ceil(blockDuration / 1000);
        await this.redisClient!.setex(blockKey, blockSeconds, '1');
        return {
          totalHits: hits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: blockSeconds,
        };
      }

      return {
        totalHits: hits,
        timeToExpire,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis throttler increment failed: ${errorMessage}, using in-memory fallback`);
      return this.inMemoryFallback(key, ttlSeconds, limit, blockDuration);
    }
  }

  private inMemoryStore = new Map<string, { hits: number; expiresAt: number }>();
  private blockStore = new Map<string, { blocked: true; expiresAt: number }>();

  private inMemoryFallback(
    key: string,
    ttlSeconds: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerStorageRecord {
    const now = Date.now();

    this.cleanupStore(now);

    const blockEntry = this.blockStore.get(key);
    if (blockEntry && blockEntry.expiresAt > now) {
      return {
        totalHits: this.inMemoryStore.get(key)?.hits ?? 0,
        timeToExpire: ttlSeconds,
        isBlocked: true,
        timeToBlockExpire: Math.ceil((blockEntry.expiresAt - now) / 1000),
      };
    }

    const entry = this.inMemoryStore.get(key);
    const hits = entry && entry.expiresAt > now ? entry.hits + 1 : 1;
    this.inMemoryStore.set(key, { hits, expiresAt: now + ttlSeconds * 1000 });

    if (hits > limit) {
      const blockSeconds = Math.ceil(blockDuration / 1000);
      this.blockStore.set(key, { blocked: true, expiresAt: now + blockSeconds * 1000 });
      return {
        totalHits: hits,
        timeToExpire: ttlSeconds,
        isBlocked: true,
        timeToBlockExpire: blockSeconds,
      };
    }

    return {
      totalHits: hits,
      timeToExpire: ttlSeconds,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private cleanupStore(now: number) {
    for (const [key, entry] of this.inMemoryStore) {
      if (entry.expiresAt <= now) this.inMemoryStore.delete(key);
    }
    for (const [key, entry] of this.blockStore) {
      if (entry.expiresAt <= now) this.blockStore.delete(key);
    }
  }
}
