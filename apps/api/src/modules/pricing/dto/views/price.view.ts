export class PriceView {
  id: string;
  variantId: string;
  currency: string;
  symbol: string;
  decimals: number;
  tiers: PriceTierView[];

  static fromEntity(pricing: any): PriceView {
    const view = new PriceView();
    view.id = pricing.id;
    view.variantId = pricing.variantId;
    view.currency = pricing.currency.code;
    view.symbol = pricing.currency.symbol;
    view.decimals = pricing.currency.decimals;
    view.tiers = pricing.tiers.map((tier: any) => PriceTierView.fromEntity(tier));
    return view;
  }

  static fromEntities(pricings: any[]): PriceView[] {
    return pricings.map((pricing) => PriceView.fromEntity(pricing));
  }
}

export class PriceTierView {
  id: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number;

  static fromEntity(tier: any): PriceTierView {
    const view = new PriceTierView();
    view.id = tier.id;
    view.minQty = tier.minQty;
    view.maxQty = tier.maxQty;
    view.unitPrice = Number(tier.unitPrice);
    return view;
  }
}
