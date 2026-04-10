import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StorageModule } from '@modules/storage/storage.module';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { ProductRepository } from './repositories/product.repository';
import { ProductVariantRepository } from './repositories/product-variant.repository';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryImageRepository } from './repositories/category-image.repository';
import { ProductImageRepository } from './repositories/product-image.repository';
import { VariantImageRepository } from './repositories/variant-image.repository';
import { ProductTableColumnRepository } from './repositories/product-table-column.repository';
import { CategoriesController } from './controllers/categories.controller';
import { ProductsController } from './controllers/products.controller';

@Module({
  imports: [EventEmitterModule, StorageModule],
  controllers: [CategoriesController, ProductsController],
  providers: [
    // Services
    ProductService,
    CategoryService,
    // Repositories
    ProductRepository,
    ProductVariantRepository,
    CategoryRepository,
    CategoryImageRepository,
    ProductImageRepository,
    VariantImageRepository,
    ProductTableColumnRepository,
  ],
  exports: [
    // Services (Public API)
    ProductService,
    CategoryService,
    // Repositories (read-only for queries)
    ProductRepository,
    ProductVariantRepository,
    CategoryRepository,
    CategoryImageRepository,
    ProductImageRepository,
    VariantImageRepository,
    ProductTableColumnRepository,
  ],
})
export class CatalogModule {}
