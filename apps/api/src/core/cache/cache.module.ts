import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';

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
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
