import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class ProductVariantNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('ProductVariant', identifier);
  }
}

export class ProductVariantSkuAlreadyExistsError extends AlreadyExistsError {
  constructor(sku: string) {
    super('ProductVariant', 'SKU', sku);
  }
}

export class ProductVariantVersionConflictError extends InvalidOperationError {
  constructor(variantId: string) {
    super(
      `Product variant has been modified by another operation: ${variantId}`,
      'PRODUCT_VARIANT_VERSION_CONFLICT',
    );
  }
}
