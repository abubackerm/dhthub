import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EnquiryController, AdminEnquiryController } from './controllers';
import { EnquiryService } from './services';
import { EnquiryRepository, EnquiryItemRepository } from './repositories';
import { CartModule } from '../cart/cart.module';
import { CatalogModule } from '../catalog/catalog.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EventEmitterModule,
    forwardRef(() => CartModule),
    forwardRef(() => CatalogModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [EnquiryController, AdminEnquiryController],
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
