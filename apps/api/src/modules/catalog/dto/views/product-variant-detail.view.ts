import { ProductVariantEntity } from '../../entities/product-variant.entity';
import { VariantAttributeView } from '@modules/catalog-attributes/dto/views/variant-attribute.view';

export class ProductVariantDetailView {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  quantity: number;
  isDefault: boolean;
  attributes: VariantAttributeView[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    variant: ProductVariantEntity & { attributeValues?: any[] },
  ): ProductVariantDetailView {
    const view = new ProductVariantDetailView();
    view.id = variant.id;
    view.productId = variant.productId;
    view.sku = variant.sku;
    view.name = variant.name;
    view.price = variant.price;
    view.compareAtPrice = variant.compareAtPrice;
    view.costPrice = variant.costPrice;
    view.quantity = variant.quantity;
    view.isDefault = variant.isDefault;
    view.createdAt = variant.createdAt;
    view.updatedAt = variant.updatedAt;

    if (variant.attributeValues) {
      view.attributes = VariantAttributeView.fromEntities(variant.attributeValues);
    } else {
      view.attributes = [];
    }

    return view;
  }

  static fromEntities(
    variants: (ProductVariantEntity & { attributeValues?: any[] })[],
  ): ProductVariantDetailView[] {
    return variants.map((variant) => ProductVariantDetailView.fromEntity(variant));
  }
}
