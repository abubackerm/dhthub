import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { ProductRepository } from './repositories/product.repository';
import { ProductVariantRepository } from './repositories/product-variant.repository';
import { CategoryRepository } from './repositories/category.repository';
import { ProductImageRepository } from './repositories/product-image.repository';

@Module({
  imports: [EventEmitterModule],
  providers: [
    // Services
    ProductService,
    CategoryService,
    // Repositories
    ProductRepository,
    ProductVariantRepository,
    CategoryRepository,
    ProductImageRepository,
  ],
  exports: [
    // Services (Public API)
    ProductService,
    CategoryService,
    // Repositories (read-only for queries)
    ProductRepository,
    CategoryRepository,
  ],
})
export class CatalogModule {}
