import { BaseEntity } from '@shared/common/base.entity';

export class CurrencyEntity extends BaseEntity {
  code: string;
  symbol: string;
  decimals: number;
}
