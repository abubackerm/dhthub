import { BaseEntity } from '@shared/common/base.entity';
import { MovementType, MovementReason } from './enums';

export class InventoryMovementEntity extends BaseEntity {
  inventoryId: string;
  type: MovementType;
  quantity: number;
  reason: MovementReason | null;
  referenceId: string | null;
}
