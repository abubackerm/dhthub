// Re-export from catalog-attribute.errors.ts for backward compatibility
export { VariantNotFoundError } from './catalog-attribute.errors';

export class VariantSkuAlreadyExistsError extends Error {
  constructor(sku: string) {
    super(`Variant with SKU "${sku}" already exists`);
    this.name = 'VariantSkuAlreadyExistsError';
  }
}
