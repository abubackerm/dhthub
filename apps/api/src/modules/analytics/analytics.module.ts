import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers';
import { AnalyticsService } from './services';
import { AnalyticsRepository } from './repositories';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRepository],
  exports: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
