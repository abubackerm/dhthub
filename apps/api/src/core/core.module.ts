import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache';
import { HealthController } from './health';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    DatabaseModule,
    CacheModule,
  ],
  controllers: [HealthController],
  exports: [DatabaseModule, CacheModule],
})
export class CoreModule {}
