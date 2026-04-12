import { Controller, Get } from '@nestjs/common';
import { CacheHealthService } from '../cache/cache-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly cacheHealth: CacheHealthService) {}

  @Get()
  async check() {
    const cacheReport = await this.cacheHealth.getHealth();

    const status = cacheReport.status === 'healthy' ? 'ok' : cacheReport.status;
    const isDegraded = cacheReport.status !== 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      degraded: isDegraded,
      cache: {
        status: cacheReport.status,
        redis: {
          connected: cacheReport.redis.connected,
          memory: cacheReport.redis.memory
            ? {
                used: cacheReport.redis.memory.usedMemoryHuman,
                max: cacheReport.redis.memory.maxmemoryHuman,
                usedPercentage: Math.round(cacheReport.redis.memory.usedMemoryPercentage * 100),
                fragmentationRatio: Math.round(cacheReport.redis.memory.fragmentationRatio * 100) / 100,
              }
            : null,
          keyspace: cacheReport.redis.keyspace,
        },
        warnings: cacheReport.warnings,
      },
    };
  }
}
