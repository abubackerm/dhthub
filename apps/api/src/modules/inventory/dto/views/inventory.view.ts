export class InventoryView {
  variantId: string;
  warehouseId: string;
  warehouseName: string;
  availableQty: number;
  reservedQty: number;
  safetyStock: number;
  sellableQty: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(data: any): InventoryView {
    const view = new InventoryView();
    view.variantId = data.variantId;
    view.warehouseId = data.warehouseId;
    view.warehouseName = data.warehouseName;
    view.availableQty = data.availableQty;
    view.reservedQty = data.reservedQty;
    view.safetyStock = data.safetyStock;
    view.sellableQty = data.sellableQty ?? Math.max(0, data.availableQty - data.safetyStock);
    view.createdAt = data.createdAt;
    view.updatedAt = data.updatedAt;
    return view;
  }
}
