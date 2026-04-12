import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import type { Redis } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {}

  private get isRedisAvailable(): boolean {
    return this.redisClient !== undefined;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== null && value !== undefined) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
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
    try {
      await this.cacheManager.set(key, value, ttl ? ttl * 1000 : undefined);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to set cache key "${key}": ${errorMessage}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to delete cache key "${key}": ${errorMessage}`);
    }
  }

  /**
   * Delete multiple known keys in a single pipelined round-trip.
   * Prefer this over individual `del()` calls when you have 2+ keys.
   */
  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;

    if (!this.isRedisAvailable) {
      this.logger.warn(
        `delMany: Redis client not available, falling back to individual deletes for ${keys.length} key(s)`,
      );
      let count = 0;
      for (const key of keys) {
        try {
          await this.cacheManager.del(key);
          count++;
        } catch {
          // logged per-key inside del()
        }
      }
      return count;
    }

    try {
      const pipeline = this.redisClient!.pipeline();
      for (const key of keys) {
        pipeline.unlink(key);
      }
      const results = await pipeline.exec();
      let deleted = 0;
      for (const [err, result] of results ?? []) {
        if (!err && (result as number) > 0) deleted++;
      }
      return deleted;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`delMany failed for ${keys.length} key(s): ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Delete all keys matching a glob pattern (e.g. `catalog:v2:*`).
   *
   * Uses SCAN + UNLINK in chunks to avoid blocking Redis. Safe for
   * production — never uses the blocking KEYS command.
   *
   * @param pattern  Redis glob pattern (supports `*`, `?`, `[...]`)
   * @param chunkSize  Keys per pipeline batch (default 100)
   * @returns Total number of keys deleted
   */
  async delPattern(pattern: string, chunkSize = 100): Promise<number> {
    if (!this.isRedisAvailable) {
      this.logger.warn(
        `delPattern: Redis client not available — pattern "${pattern}" not deleted`,
      );
      return 0;
    }

    let totalDeleted = 0;
    const stream = this.redisClient!.scanStream({
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

    return new Promise<number>((resolve) => {
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
        this.logger.log(
          `delPattern("${pattern}"): ${totalDeleted} key(s) deleted`,
        );
        resolve(totalDeleted);
      });

      stream.on('error', (error: Error) => {
        this.logger.warn(
          `delPattern scan error for "${pattern}": ${error.message}`,
        );
        resolve(totalDeleted);
      });
    });
  }

  async reset(): Promise<void> {
    try {
      // Reset not available in cache-manager v7
      this.logger.warn('reset not implemented in cache-manager v7');
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
