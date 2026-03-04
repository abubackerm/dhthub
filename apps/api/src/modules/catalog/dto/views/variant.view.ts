import { ProductVariantEntity } from '../../entities/product-variant.entity';

export class VariantView {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  quantity: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ProductVariantEntity): VariantView {
    const view = new VariantView();
    view.id = entity.id;
    view.sku = entity.sku;
    view.name = entity.name;
    view.price = entity.price;
    view.quantity = entity.quantity;
    view.isDefault = entity.isDefault;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: ProductVariantEntity[]): VariantView[] {
    return entities.map((entity) => VariantView.fromEntity(entity));
  }
}
