import { BaseEntity } from '@shared/common/base.entity';

export class CartItemEntity extends BaseEntity {
  cartId: string;
  variantId: string;
  qty: number;
}
