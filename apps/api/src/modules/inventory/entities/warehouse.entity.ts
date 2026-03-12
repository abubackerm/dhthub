import { BaseEntity } from '@shared/common/base.entity';

export class WarehouseEntity extends BaseEntity {
  name: string;
  code: string;
  location: string | null;
}
