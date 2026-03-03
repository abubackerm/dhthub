export class ProductVariantCreatedEvent {
  constructor(
    public readonly variantId: string,
    public readonly productId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
