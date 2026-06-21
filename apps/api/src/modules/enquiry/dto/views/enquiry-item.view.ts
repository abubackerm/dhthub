import { ProductVariantEntity } from '../../../catalog/entities/product-variant.entity';
import { ProductEntity } from '../../../catalog/entities/product.entity';

type EnquiryItemData = {
  id: string;
  enquiryId: string;
  variantId: string;
  productId: string;
  sku: string;
  price: number | null;
  total: number | null;
  qty: number;
  createdAt: Date;
  updatedAt: Date;
};

export class EnquiryItemView {
  id: string;
  enquiryId: string;
  variantId: string;
  productId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  image: string | null;
  price: number | null;
  total: number | null;
  qty: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    entity: EnquiryItemData,
    variant: ProductVariantEntity,
    product: ProductEntity,
  ): EnquiryItemView {
    const view = new EnquiryItemView();
    view.id = entity.id;
    view.enquiryId = entity.enquiryId;
    view.variantId = entity.variantId;
    view.productId = variant.productId;
    view.sku = variant.sku;
    view.productName = product.name;
    view.variantName = variant.name;
    view.image = (product as any).primaryImageUrl || null;
    // entity.price is in SAR (stored from enquiry creation)
    // variant.price is in cents (halalas) — only use as fallback and convert
    view.price = entity.price != null
      ? Number(entity.price)
      : (variant.price != null ? Number(variant.price) / 100 : null);
    view.total = entity.total != null
      ? Number(entity.total)
      : (view.price != null ? view.price * entity.qty : null);
    view.qty = entity.qty;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(
    entities: EnquiryItemData[],
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
