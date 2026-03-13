import { EnquiryItemEntity } from '../../entities/enquiry-item.entity';
import { ProductVariantEntity } from '../../../catalog/entities/product-variant.entity';
import { ProductEntity } from '../../../catalog/entities/product.entity';

export class EnquiryItemView {
  id: string;
  enquiryId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  image: string | null;
  qty: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    entity: EnquiryItemEntity | { id: string; enquiryId: string; variantId: string; qty: number; createdAt: Date; updatedAt: Date },
    variant: ProductVariantEntity,
    product: ProductEntity,
  ): EnquiryItemView {
    const view = new EnquiryItemView();
    view.id = entity.id;
    view.enquiryId = entity.enquiryId;
    view.variantId = entity.variantId;
    view.sku = variant.sku;
    view.productName = product.name;
    view.variantName = variant.name;
    view.image = (product as any).primaryImageUrl || null;
    view.qty = entity.qty;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(
    entities: EnquiryItemEntity[],
    variants: Map<string, ProductVariantEntity>,
    products: Map<string, ProductEntity>,
  ): EnquiryItemView[] {
    return entities.map((entity) => {
      const variant = variants.get(entity.variantId);
      const product = variant ? products.get(variant.productId) : null;
      if (!variant || !product) {
        throw new Error(`Missing variant or product data for item ${entity.id}`);
      }
      return EnquiryItemView.fromEntity(entity, variant, product);
    });
  }
}
