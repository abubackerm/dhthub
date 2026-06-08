import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './cache.service';
import { CacheKeyService } from './cache-key.service';

export interface RedisMemoryInfo {
  usedMemory: number;
  usedMemoryHuman: string;
  usedMemoryRss: number;
  usedMemoryRssHuman: string;
  usedMemoryPeak: number;
  usedMemoryPeakHuman: string;
  maxmemory: number;
  maxmemoryHuman: string;
  usedMemoryPercentage: number;
  fragmentationRatio: number;
  totalSystemMemory: number;
  totalSystemMemoryHuman: string;
}

export interface KeyspaceSample {
  prefix: string;
  count: number;
}

export interface CacheHealthReport {
  status: 'healthy' | 'warning' | 'critical';
  redis: {
    connected: boolean;
    memory: RedisMemoryInfo | null;
    keyspace: KeyspaceSample[];
    alertThreshold: number;
  };
  cacheKeys: {
    catalogVersion: number;
    productVersion: number;
    catalogPattern: string;
    productPattern: string;
  };
  warnings: string[];
}

@Injectable()
export class CacheHealthService {
  private readonly logger = new Logger(CacheHealthService.name);

  constructor(
    private readonly cacheKeyService: CacheKeyService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {}

  private get isRedisAvailable(): boolean {
    return this.redisClient !== undefined;
  }

  /**
   * Alert threshold for Redis memory usage as a fraction (0-1).
   * At 80% of maxmemory, Redis with `noeviction` policy will start
   * rejecting writes — BullMQ job data and cache sets will fail.
   */
  private get alertThreshold(): number {
    const env = process.env.REDIS_MEMORY_ALERT_THRESHOLD;
    if (env) {
      const parsed = parseFloat(env);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 1) {
        return parsed;
      }
    }
    return 0.8;
  }

  async getHealth(): Promise<CacheHealthReport> {
    const warnings: string[] = [];

    if (!this.isRedisAvailable) {
      return {
        status: 'healthy',
        redis: { connected: false, memory: null, keyspace: [], alertThreshold: this.alertThreshold },
        cacheKeys: this.getCacheKeyInfo(),
        warnings: ['Redis client not available (dev mode or connection failure)'],
      };
    }

    const connected = this.redisClient!.status === 'ready';
    const memory = await this.getMemoryInfo();
    const keyspace = await this.getKeyspaceSample();

    if (memory && memory.maxmemory > 0) {
      const pct = memory.usedMemoryPercentage;
      if (pct >= 0.95) {
        warnings.push(
          `Redis memory CRITICAL: ${pct.toFixed(1)}% used (${memory.usedMemoryHuman} / ${memory.maxmemoryHuman}). ` +
          `Writes may fail with noeviction policy.`,
        );
      } else if (pct >= this.alertThreshold) {
        warnings.push(
          `Redis memory WARNING: ${pct.toFixed(1)}% used (${memory.usedMemoryHuman} / ${memory.maxmemoryHuman}). ` +
          `Approaching ${Math.round(this.alertThreshold * 100)}% alert threshold.`,
        );
      }
    }

    if (memory && memory.fragmentationRatio > 1.5) {
      warnings.push(
        `Redis fragmentation ratio HIGH: ${memory.fragmentationRatio.toFixed(2)}. ` +
        `Consider enabling activedefrag or restarting Redis.`,
      );
    }

    let status: CacheHealthReport['status'] = 'healthy';
    if (warnings.some((w) => w.includes('CRITICAL'))) {
      status = 'critical';
    } else if (warnings.length > 0) {
      status = 'warning';
    }

    return {
      status,
      redis: {
        connected,
        memory,
        keyspace,
        alertThreshold: this.alertThreshold,
      },
      cacheKeys: this.getCacheKeyInfo(),
      warnings,
    };
  }

  async getMemoryInfo(): Promise<RedisMemoryInfo | null> {
    if (!this.isRedisAvailable) return null;

    try {
      const [memoryInfo, maxmemoryConfig] = await Promise.all([
        this.redisClient!.info('memory'),
        this.redisClient!.call('config', 'get', 'maxmemory') as Promise<[string, string]>,
      ]);

      const memory = this.parseInfoSection(memoryInfo, 'memory');
      const maxmemoryBytes = parseInt(
        Array.isArray(maxmemoryConfig) ? maxmemoryConfig[1] : String(maxmemoryConfig),
        10,
      );

      const usedMemory = parseInt(memory?.['used_memory'] || '0', 10);
      const usedMemoryRss = parseInt(memory?.['used_memory_rss'] || '0', 10);
      const usedMemoryPeak = parseInt(memory?.['used_memory_peak'] || '0', 10);
      const totalSystemMemory = parseInt(memory?.['total_system_memory'] || '0', 10);

      const fragRatio = usedMemoryRss > 0 ? usedMemoryRss / usedMemory : 0;

      return {
        usedMemory,
        usedMemoryHuman: this.formatBytes(usedMemory),
        usedMemoryRss,
        usedMemoryRssHuman: this.formatBytes(usedMemoryRss),
        usedMemoryPeak,
        usedMemoryPeakHuman: this.formatBytes(usedMemoryPeak),
        maxmemory: maxmemoryBytes,
        maxmemoryHuman: this.formatBytes(maxmemoryBytes),
        usedMemoryPercentage: maxmemoryBytes > 0 ? usedMemory / maxmemoryBytes : 0,
        fragmentationRatio: fragRatio,
        totalSystemMemory,
        totalSystemMemoryHuman: this.formatBytes(totalSystemMemory),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get Redis memory info: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Sample keyspace by counting keys per known cache prefix.
   * Uses SCAN to avoid blocking Redis — safe for production.
   */
  async getKeyspaceSample(prefixes?: string[]): Promise<KeyspaceSample[]> {
    if (!this.isRedisAvailable) return [];

    const defaultPrefixes = [
      this.cacheKeyService.catalogPattern().replace(':*', ''),
      this.cacheKeyService.productPattern().replace(':*', ''),
      'bull:',
    ];

    const targets = prefixes ?? defaultPrefixes;

    const results = await Promise.allSettled(
      targets.map(async (prefix) => {
        let count = 0;
        const stream = this.redisClient!.scanStream({
          match: `${prefix}*`,
          count: 200,
        });

        await new Promise<void>((resolve) => {
          stream.on('data', (keys: string[]) => {
            count += keys.length;
          });
          stream.on('end', resolve);
          stream.on('error', () => resolve());
        });

        return { prefix, count };
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<KeyspaceSample> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /**
   * Quick check: is Redis memory above the alert threshold?
   * Useful for lightweight pre-flight checks in import handlers.
   */
  async isMemoryPressure(): Promise<boolean> {
    const memory = await this.getMemoryInfo();
    if (!memory || memory.maxmemory === 0) return false;
    return memory.usedMemoryPercentage >= this.alertThreshold;
  }

  private getCacheKeyInfo() {
    return {
      catalogVersion: this.cacheKeyService['catalogVersion'],
      productVersion: this.cacheKeyService['productVersion'],
      catalogPattern: this.cacheKeyService.catalogPattern(),
      productPattern: this.cacheKeyService.productPattern(),
    };
  }

  private parseInfoSection(info: string, section: string): Record<string, string> {
    const lines = info.split('\n');
    const result: Record<string, string> = {};
    let inSection = false;

    for (const line of lines) {
      if (line.startsWith('#')) {
        inSection = line.toLowerCase().includes(section.toLowerCase());
        continue;
      }
      if (inSection) {
        const eqIdx = line.indexOf(':');
        if (eqIdx !== -1) {
          result[line.slice(0, eqIdx).trim()] = line.slice(eqIdx + 1).trim();
        }
      }
    }

    return result;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    return `${(bytes / Math.pow(1024, i)).toFixed(1)}${units[i]}`;
  }
}
