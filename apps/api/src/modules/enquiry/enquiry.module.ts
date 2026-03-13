import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EnquiryController } from './controllers';
import { EnquiryService } from './services';
import { EnquiryRepository, EnquiryItemRepository } from './repositories';
import { CartModule } from '../cart/cart.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    EventEmitterModule,
    forwardRef(() => CartModule),
    forwardRef(() => CatalogModule),
  ],
  controllers: [EnquiryController],
  providers: [
    EnquiryService,
    EnquiryRepository,
    EnquiryItemRepository,
  ],
  exports: [
    EnquiryService,
  ],
})
export class EnquiryModule {}
