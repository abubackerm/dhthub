export class StockAdjustedEvent {
  constructor(
    public readonly variantId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly previousAvailable: number,
    public readonly newAvailable: number,
    public readonly reason: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
