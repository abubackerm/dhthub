export class StockSummaryView {
  available: number;
  reserved: number;
  safetyStock: number;
  sellable: number;

  constructor(data: {
    available: number;
    reserved: number;
    safetyStock: number;
    sellable: number;
  }) {
    this.available = data.available;
    this.reserved = data.reserved;
    this.safetyStock = data.safetyStock;
    this.sellable = data.sellable;
  }
}
