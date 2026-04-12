import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService, REDIS_CLIENT } from './cache.service';
import { CacheKeyService } from './cache-key.service';
import { DistributedLockService } from './distributed-lock.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { NextJsRevalidationService } from './nextjs-revalidation.service';
import { CacheHealthService } from './cache-health.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';

@Global()
@Module({
  imports: [],
  providers: [
    CacheService,
    CacheKeyService,
    DistributedLockService,
    CacheInvalidationService,
    NextJsRevalidationService,
    CacheHealthService,
    RedisThrottlerStorage,
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const cacheConfig = configService.get('cache');
        const isDevelopment = configService.get('nodeEnv') === 'development';

        if (isDevelopment && !process.env.REDIS_HOST) {
          return undefined;
        }

        return new Redis({
          host: cacheConfig.host,
          port: cacheConfig.port,
          password: cacheConfig.password,
          db: cacheConfig.db,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [CacheService, CacheKeyService, DistributedLockService, CacheInvalidationService, NextJsRevalidationService, CacheHealthService, RedisThrottlerStorage, REDIS_CLIENT],
})
export class CacheModule {}
