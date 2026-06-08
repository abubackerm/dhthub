import { BaseEntity } from '@shared/common/base.entity';
import { ReservationStatus } from './enums';

export class InventoryReservationEntity extends BaseEntity {
  inventoryId: string;
  quantity: number;
  referenceId: string;
  referenceType: string;
  status: ReservationStatus;
  expiresAt: Date | null;
}
