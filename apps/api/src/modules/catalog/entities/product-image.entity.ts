import { BaseEntity } from '@shared/common/base.entity';

export class ProductImageEntity extends BaseEntity {
  productId: string;
  variantId: string | null;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}
