import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-ioredis-yet';
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
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const cacheConfig = configService.get('cache');
        const isDevelopment = configService.get('nodeEnv') === 'development';

        // In development without Redis, use in-memory cache
        if (isDevelopment && !process.env.REDIS_HOST) {
          return {
            store: 'memory',
            ttl: 300,
          };
        }

        return {
          store: redisStore,
          host: cacheConfig.host,
          port: cacheConfig.port,
          password: cacheConfig.password,
          db: cacheConfig.db,
          ttl: 3600,
        };
      },
      inject: [ConfigService],
    }),
  ],
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
