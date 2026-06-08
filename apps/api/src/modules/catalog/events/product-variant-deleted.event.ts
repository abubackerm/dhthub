export class ProductVariantDeletedEvent {
  constructor(
    public readonly variantId: string,
    public readonly productId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
