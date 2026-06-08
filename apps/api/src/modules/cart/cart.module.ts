import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CartController } from './controllers';
import { CartService } from './services';
import { CartRepository, CartItemRepository } from './repositories';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    EventEmitterModule,
    forwardRef(() => CatalogModule),
  ],
  controllers: [CartController],
  providers: [
    CartService,
    CartRepository,
    CartItemRepository,
  ],
  exports: [
    CartService,
    CartRepository,
  ],
})
export class CartModule {}
