import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeyService } from './cache-key.service';
import { DistributedLockService } from './distributed-lock.service';

/**
 * Cluster-safe cache invalidation service.
 *
 * Wraps `delPattern` / `delMany` calls with a distributed Redis lock so that
 * when multiple API processes handle the same logical event (e.g. import
 * completion propagated via EventEmitter2 across PM2 cluster instances), only
 * **one** process actually performs the expensive SCAN + UNLINK operation.
 *
 * ## Usage
 *
 * ```ts
 * // Inside an import completion handler (runs in every cluster process):
 * await invalidation.invalidateCatalog('import-complete');
 * ```
 *
 * ## Why not just call CacheService.delPattern directly?
 *
 * EventEmitter2 in NestJS is **in-process only** — events do NOT cross
 * Node.js worker boundaries.  However, import completion can be triggered
 * via HTTP request (e.g. webhook from a worker process) which lands on
 * **one** API instance, so the lock is primarily a safety net for:
 *
 * 1. Future PM2 cluster mode where multiple HTTP requests may arrive.
 * 2. BullMQ worker processes that might call back into the API.
 * 3. Any fan-out pattern (pub/sub, polling) that could cause duplicate execution.
 */
@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheKeyService: CacheKeyService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  /**
   * Invalidate **all** catalog cache keys (tree + every slug-scoped endpoint).
   *
   * Uses a distributed lock so only one cluster instance performs the SCAN.
   * Suitable for broad changes: category create/move/delete, catalog imports.
   *
   * @param context  Human-readable label for logging (e.g. `'category-move'`, `'import-complete'`).
   */
  async invalidateCatalog(context: string): Promise<void> {
    const lockKey = `lock:invalidation:catalog`;

    const { executed } = await this.distributedLock.withLock(
      lockKey,
      async () => {
        const deleted = await this.cacheService.delPattern(
          this.cacheKeyService.catalogPattern(),
        );
        this.logger.log(
          `Catalog cache invalidated (${context}): ${deleted} key(s) deleted`,
        );
      },
      { ttlMs: 15_000 },
    );

    if (!executed) {
      this.logger.debug(
        `Catalog cache invalidation skipped (${context}) — another process is handling it`,
      );
    }
  }

  /**
   * Invalidate **all** product cache keys (every product slug endpoint).
   *
   * Uses a distributed lock so only one cluster instance performs the SCAN.
   * Suitable for bulk product imports or price/stock bulk updates.
   *
   * @param context  Human-readable label for logging.
   */
  async invalidateProducts(context: string): Promise<void> {
    const lockKey = `lock:invalidation:products`;

    const { executed } = await this.distributedLock.withLock(
      lockKey,
      async () => {
        const deleted = await this.cacheService.delPattern(
          this.cacheKeyService.productPattern(),
        );
        this.logger.log(
          `Product cache invalidated (${context}): ${deleted} key(s) deleted`,
        );
      },
      { ttlMs: 15_000 },
    );

    if (!executed) {
      this.logger.debug(
        `Product cache invalidation skipped (${context}) — another process is handling it`,
      );
    }
  }

  /**
   * Invalidate both catalog and product caches.
   *
   * Acquires a single lock for the combined operation to prevent interleaving
   * partial invalidations from different processes.
   *
   * @param context  Human-readable label for logging.
   */
  async invalidateAll(context: string): Promise<void> {
    const lockKey = `lock:invalidation:all`;

    const { executed } = await this.distributedLock.withLock(
      lockKey,
      async () => {
        const catalogDeleted = await this.cacheService.delPattern(
          this.cacheKeyService.catalogPattern(),
        );
        const productDeleted = await this.cacheService.delPattern(
          this.cacheKeyService.productPattern(),
        );
        this.logger.log(
          `Full cache invalidated (${context}): catalog=${catalogDeleted}, product=${productDeleted} key(s) deleted`,
        );
      },
      { ttlMs: 30_000 },
    );

    if (!executed) {
      this.logger.debug(
        `Full cache invalidation skipped (${context}) — another process is handling it`,
      );
    }
  }

  /**
   * Targeted invalidation for specific catalog keys (no lock needed).
   *
   * Use for single-category updates where the key set is known and small.
   * The distributed lock is unnecessary here because these are O(1) pipelined
   * deletes that are safe to execute from any process.
   *
   * @param keys     Array of exact cache keys to delete.
   * @param context  Human-readable label for logging.
   */
  async invalidateCatalogKeys(
    keys: string[],
    context: string,
  ): Promise<void> {
    if (keys.length === 0) return;

    const deleted = await this.cacheService.delMany(keys);
    this.logger.debug(
      `Catalog keys invalidated (${context}): ${deleted} key(s) deleted`,
    );
  }

  /**
   * Targeted invalidation for specific product keys (no lock needed).
   *
   * @param keys     Array of exact cache keys to delete.
   * @param context  Human-readable label for logging.
   */
  async invalidateProductKeys(
    keys: string[],
    context: string,
  ): Promise<void> {
    if (keys.length === 0) return;

    const deleted = await this.cacheService.delMany(keys);
    this.logger.debug(
      `Product keys invalidated (${context}): ${deleted} key(s) deleted`,
    );
  }
}
