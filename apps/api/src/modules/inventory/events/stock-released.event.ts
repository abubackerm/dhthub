export class StockReleasedEvent {
  constructor(
    public readonly variantId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly referenceId: string,
    public readonly referenceType: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
