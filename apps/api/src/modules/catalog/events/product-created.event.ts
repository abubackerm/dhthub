export class ProductCreatedEvent {
  constructor(
    public readonly productId: string,
    public readonly sku: string | null,
    public readonly name: string,
    public readonly slug: string,
    public readonly type: string,
    public readonly status: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
