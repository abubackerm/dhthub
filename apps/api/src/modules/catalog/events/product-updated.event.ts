export class ProductUpdatedEvent {
  constructor(
    public readonly productId: string,
    public readonly changes: Record<string, { from: unknown; to: unknown }>,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
