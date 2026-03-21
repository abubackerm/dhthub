import { ProductVariantEntity } from '../../entities/product-variant.entity';

export class VariantView {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  quantity: number;
  isDefault: boolean;
  images: { url: string; altText: string | null; isPrimary: boolean }[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: ProductVariantEntity & { variantImages?: any[] }): VariantView {
    const view = new VariantView();
    view.id = entity.id;
    view.sku = entity.sku;
    view.name = entity.name;
    view.price = entity.price;
    view.quantity = entity.quantity;
    view.isDefault = entity.isDefault;
    view.images = (entity.variantImages || []).map((img) => ({
      url: img.storagePath,
      altText: img.altText,
      isPrimary: img.isPrimary,
    }));
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: (ProductVariantEntity & { variantImages?: any[] })[]): VariantView[] {
    return entities.map((entity) => VariantView.fromEntity(entity));
  }
}
