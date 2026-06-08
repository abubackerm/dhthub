export class PricingUpdatedEvent {
  constructor(
    public readonly priceId: string,
    public readonly variantId: string,
    public readonly currencyCode: string,
    public readonly tierCount: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
