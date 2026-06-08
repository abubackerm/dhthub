import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PricingService } from './services/pricing.service';
import { PriceRepository } from './repositories/price.repository';
import { PricingController } from './controllers/pricing.controller';

@Module({
  imports: [EventEmitterModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    PriceRepository,
  ],
  exports: [
    PricingService,
    PriceRepository,
  ],
})
export class PricingModule {}
