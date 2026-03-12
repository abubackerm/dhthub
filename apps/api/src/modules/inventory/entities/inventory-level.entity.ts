import { BaseEntity } from '@shared/common/base.entity';

export class InventoryLevelEntity extends BaseEntity {
  variantId: string;
  warehouseId: string;
  availableQty: number;
  reservedQty: number;
  safetyStock: number;
}
