import { BaseEntity } from '@shared/common/base.entity';

export class EnquiryItemEntity extends BaseEntity {
  enquiryId: string;
  variantId: string;
  qty: number;
}
