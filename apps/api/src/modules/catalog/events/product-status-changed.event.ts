export class ProductStatusChangedEvent {
  constructor(
    public readonly productId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
