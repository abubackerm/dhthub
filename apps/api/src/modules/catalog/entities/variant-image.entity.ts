import { BaseEntity } from '@shared/common/base.entity';

export class VariantImageEntity extends BaseEntity {
  variantId: string;
  sku: string;
  storagePath: string;
  position: number;
  altText: string | null;
  isPrimary: boolean;
}
