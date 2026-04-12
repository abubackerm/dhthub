import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './cache.service';
import { randomUUID } from 'crypto';

/**
 * Distributed lock backed by Redis `SET key NX EX`.
 *
 * Ensures that side effects triggered from multiple API processes (e.g. PM2
 * cluster mode) execute exactly once for a given lock key.  Typical use:
 *
 *   const acquired = await lock.acquire('revalidate:catalog', { ttlMs: 30_000 });
 *   if (acquired) {
 *     await cacheService.delPattern(cacheKeyService.catalogPattern());
 *     await lock.release('revalidate:catalog');
 *   }
 *
 * ## Design choices
 *
 * - **Value = UUID** — prevents accidental release by a stale/different holder.
 * - **NX + PX** — atomic set-if-absent with TTL so a crashed process cannot
 *   hold the lock forever.
 * - **Graceful fallback** — when Redis is unavailable (local dev without Redis)
 *   the lock is always "acquired" so development is unblocked.
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {}

  private get isRedisAvailable(): boolean {
    return this.redisClient !== undefined;
  }

  /**
   * Try to acquire a distributed lock.
   *
   * @param lockKey   Unique identifier for the operation (e.g. `revalidate:catalog:job-123`).
   * @param options   `ttlMs` — how long the lock lives before auto-expiring (default 30 s).
   *                  `retryCount` — how many times to retry on failure (default 0).
   *                  `retryDelayMs` — delay between retries (default 200 ms).
   * @returns `true` if the lock was acquired, `false` otherwise.
   */
  async acquire(
    lockKey: string,
    options: {
      ttlMs?: number;
      retryCount?: number;
      retryDelayMs?: number;
    } = {},
  ): Promise<boolean> {
    const { ttlMs = 30_000, retryCount = 0, retryDelayMs = 200 } = options;

    if (!this.isRedisAvailable) {
      this.logger.debug(
        `Lock "${lockKey}": Redis unavailable — acquiring unconditionally (dev mode)`,
      );
      return true;
    }

    const ownerId = randomUUID();

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      const result = await this.redisClient!.set(lockKey, ownerId, 'PX', ttlMs, 'NX');

      if (result === 'OK') {
        this.logger.debug(
          `Lock "${lockKey}" acquired (owner=${ownerId.slice(0, 8)}, ttl=${ttlMs}ms)`,
        );
        return true;
      }

      if (attempt < retryCount) {
        await this.sleep(retryDelayMs);
      }
    }

    this.logger.debug(
      `Lock "${lockKey}" not acquired (held by another process)`,
    );
    return false;
  }

  /**
   * Release a lock that was previously acquired.
   *
   * Uses a simple DEL since lock keys have short TTLs and the critical
   * section (e.g. delPattern) completes quickly. Worst case: the lock
   * is released slightly early and the next attempt runs sooner than expected.
   *
   * @param lockKey  The same key passed to `acquire()`.
   */
  async release(lockKey: string): Promise<void> {
    if (!this.isRedisAvailable) {
      return;
    }

    try {
      await this.redisClient!.del(lockKey);
      this.logger.debug(`Lock "${lockKey}" released`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to release lock "${lockKey}": ${errorMessage}`);
    }
  }

  /**
   * Execute `fn` exactly once across all cluster instances for a given `lockKey`.
   *
   * If the lock cannot be acquired, `fn` is skipped — another process is already
   * handling it.  The lock is always released afterward (even on error).
   *
   * @returns `true` if `fn` was executed, `false` if skipped.
   */
  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    options?: { ttlMs?: number; retryCount?: number; retryDelayMs?: number },
  ): Promise<{ executed: boolean; result?: T }> {
    const acquired = await this.acquire(lockKey, options);
    if (!acquired) {
      return { executed: false };
    }

    try {
      const result = await fn();
      return { executed: true, result };
    } finally {
      await this.release(lockKey);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
