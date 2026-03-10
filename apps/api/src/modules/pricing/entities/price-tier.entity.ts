import { BaseEntity } from '@shared/common/base.entity';

export class PriceTierEntity extends BaseEntity {
  priceId: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}
