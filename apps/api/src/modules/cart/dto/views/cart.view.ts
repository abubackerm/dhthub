import { CartEntity } from '../../entities/cart.entity';
import { CartItemView } from './cart-item.view';

export class CartView {
  id: string;
  userId: string;
  items: CartItemView[];
  itemCount: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: CartEntity, items: CartItemView[] = []): CartView {
    const view = new CartView();
    view.id = entity.id;
    view.userId = entity.userId;
    view.items = items;
    view.itemCount = items.length;
    view.submittedAt = entity.submittedAt;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }
}
