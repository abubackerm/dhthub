export class StockReservedEvent {
  constructor(
    public readonly variantId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly referenceId: string,
    public readonly referenceType: string,
    public readonly expiresAt: Date | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
