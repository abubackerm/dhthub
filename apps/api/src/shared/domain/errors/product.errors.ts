import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class ProductNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Product', identifier);
  }
}

export class ProductSkuAlreadyExistsError extends AlreadyExistsError {
  constructor(sku: string) {
    super('Product', 'SKU', sku);
  }
}

export class ProductSlugAlreadyExistsError extends AlreadyExistsError {
  constructor(slug: string) {
    super('Product', 'slug', slug);
  }
}

export class InvalidProductOperationError extends InvalidOperationError {
  constructor(message: string, code: string) {
    super(message, code);
  }
}

export class ProductVersionConflictError extends InvalidOperationError {
  constructor(productId: string) {
    super(
      `Product has been modified by another operation: ${productId}`,
      'PRODUCT_VERSION_CONFLICT',
    );
  }
}

export class CatalogProductLimitReachedError extends InvalidOperationError {
  constructor(limit: number) {
    super(
      `Product limit of ${limit} reached. Upgrade plan to add more products.`,
      'CATALOG_PRODUCT_LIMIT_REACHED',
    );
  }
}
