// Catalog Module - Public API
// 
// This module follows the Aggregate Boundary pattern:
// - Product is the Aggregate Root
// - ProductVariantRepository and ProductImageRepository are INTERNAL
//   and should only be used by ProductService
// 
// External modules should ONLY inject:
// - ProductService
// - CategoryService
// - ProductRepository (for read-only queries)
// - CategoryRepository

//
// DO NOT inject ProductVariantRepository or ProductImageRepository directly!

// Module
export { CatalogModule } from './catalog.module';

// Services
export { ProductService } from './services/product.service';
export { CategoryService } from './services/category.service';

// Repositories (Public)
export { ProductRepository } from './repositories/product.repository';
export { CategoryRepository } from './repositories/category.repository';

// Entities
export * from './entities/product.entity';
export * from './entities/product-variant.entity';
export * from './entities/category.entity';
export * from './entities/product-image.entity';

// Events
export * from './events/product-created.event';
export * from './events/product-updated.event';
export * from './events/product-status-changed.event';
export * from './events/product-variant-created.event';
export * from './events/product-variant-updated.event';
export * from './events/product-variant-deleted.event';
export * from './events/category-created.event';
export * from './events/category-updated.event';
