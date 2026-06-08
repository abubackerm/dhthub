import { BaseEntity } from '@shared/common/base.entity';

export class EnquiryItemEntity extends BaseEntity {
  enquiryId: string;
  variantId: string;
  productId: string;
  sku: string;
  price: number | null;
  total: number | null;
  qty: number;
}
