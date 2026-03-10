import { BaseEntity } from '@shared/common/base.entity';
import { PriceTierEntity } from './price-tier.entity';

export class PriceEntity extends BaseEntity {
  variantId: string;
  currencyId: string;
  customerGroupId: string | null;
  regionId: string | null;

  tiers: PriceTierEntity[];
}
