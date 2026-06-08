export class ProductVariantUpdatedEvent {
  constructor(
    public readonly variantId: string,
    public readonly productId: string,
    public readonly changes: Record<string, { from: unknown; to: unknown }>,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
