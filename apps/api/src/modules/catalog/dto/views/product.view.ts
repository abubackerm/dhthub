import { ProductEntity } from '../../entities/product.entity';
import { ProductVariantEntity } from '../../entities/product-variant.entity';
import { VariantView } from './variant.view';

export class ProductView {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  type: 'simple' | 'variable';
  status: 'draft' | 'active' | 'archived';
  cellId: string | null;
  price: number | null;
  quantity: number;
  isFeatured: boolean;
  primaryImageUrl: string | null;
  variants: VariantView[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    entity: ProductEntity,
    variants: ProductVariantEntity[] = [],
  ): ProductView {
    const view = new ProductView();
    view.id = entity.id;
    view.name = entity.name;
    view.slug = entity.slug;
    view.sku = entity.sku;
    view.description = entity.description;
    view.type = entity.type as 'simple' | 'variable';
    view.status = entity.status as 'draft' | 'active' | 'archived';
    view.cellId = entity.cellId;
    view.price = entity.price;
    view.quantity = entity.quantity;
    view.isFeatured = entity.isFeatured;
    view.primaryImageUrl = null;
    view.variants = VariantView.fromEntities(variants);
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(
    entities: (ProductEntity & { variants?: ProductVariantEntity[] })[],
  ): ProductView[] {
    return entities.map((entity) =>
      ProductView.fromEntity(entity, entity.variants ?? []),
    );
  }
}
