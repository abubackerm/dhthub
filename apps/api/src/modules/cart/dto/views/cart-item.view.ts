import { CartItemEntity } from '../../entities/cart-item.entity';
import { ProductVariantEntity } from '../../../catalog/entities/product-variant.entity';
import { ProductEntity } from '../../../catalog/entities/product.entity';

export class CartItemView {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  image: string | null;
  qty: number;
  attributes: Record<string, any>;
  availableStock: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    entity: CartItemEntity | { id: string; variantId: string; qty: number; createdAt: Date; updatedAt: Date },
    variant: ProductVariantEntity,
    product: ProductEntity,
    availableStock: number,
  ): CartItemView {
    const view = new CartItemView();
    view.id = entity.id;
    view.variantId = entity.variantId;
    view.sku = variant.sku;
    view.productName = product.name;
    view.variantName = variant.name;
    view.image = (product as any).primaryImageUrl || null;
    view.qty = entity.qty;
    view.attributes = {};
    view.availableStock = availableStock;
    view.isAvailable = availableStock > 0;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(
    entities: CartItemEntity[],
    variants: Map<string, ProductVariantEntity>,
    products: Map<string, ProductEntity>,
    stockLevels: Map<string, number>,
  ): CartItemView[] {
    return entities.map((entity) => {
      const variant = variants.get(entity.variantId);
      const product = variant ? products.get(variant.productId) : null;
      const stock = stockLevels.get(entity.variantId) ?? 0;
      return CartItemView.fromEntity(entity, variant!, product!, stock);
    });
  }
}
