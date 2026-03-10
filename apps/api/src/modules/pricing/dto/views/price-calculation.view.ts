export class PriceCalculationView {
  unitPrice: number;
  totalPrice: number;
  tierMinQty: number;
  tierMaxQty: number | null;

  static fromResult(tier: any, quantity: number): PriceCalculationView {
    const view = new PriceCalculationView();
    view.unitPrice = Number(tier.unitPrice);
    view.totalPrice = Number(tier.unitPrice) * quantity;
    view.tierMinQty = tier.minQty;
    view.tierMaxQty = tier.maxQty;
    return view;
  }
}
