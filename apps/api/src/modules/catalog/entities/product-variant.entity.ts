import { BaseEntity } from '@shared/common/base.entity';

export class ProductVariantEntity extends BaseEntity {
  productId: string;
  version: number;
  sku: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  quantity: number;
  attributes: Record<string, string>;
  isDefault: boolean;
}
