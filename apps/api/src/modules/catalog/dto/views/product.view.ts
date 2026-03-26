import { ProductEntity } from '../../entities/product.entity';
import { ProductVariantEntity } from '../../entities/product-variant.entity';
import { VariantView } from './variant.view';

interface ProductImage {
  url: string;
  altText: string | null;
  isPrimary: boolean;
}

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
  thumbnailUrl: string | null;
  primaryImageUrl: string | null;
  images: ProductImage[];
  variants: VariantView[];
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    entity: ProductEntity,
    variants: ProductVariantEntity[] = [],
    images: ProductImage[] = [],
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

    // Normalize image URLs
    view.images = images.map((img) => {
      let url = img.url;
      // Normalize URL: strip http(s)://hostname, remove /catalog prefix
      if (url && url.startsWith('http')) {
        const parsed = new URL(url);
        url = parsed.pathname;
      }
      if (url && url.startsWith('/catalog')) {
        url = url.replace('/catalog', '');
      }
      return {
        url,
        altText: img.altText,
        isPrimary: img.isPrimary,
      };
    });

    // Derive primaryImageUrl from NORMALIZED images - first primary, or first image
    const primaryImage = view.images.find(img => img.isPrimary) || view.images[0];
    view.primaryImageUrl = primaryImage?.url || null;

    // Use thumbnailUrl if set and normalize it, otherwise fall back to primaryImageUrl
    let thumbnailUrl = entity.thumbnailUrl;
    if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
      const parsed = new URL(thumbnailUrl);
      thumbnailUrl = parsed.pathname;
    }
    if (thumbnailUrl && thumbnailUrl.startsWith('/catalog')) {
      thumbnailUrl = thumbnailUrl.replace('/catalog', '');
    }
    view.thumbnailUrl = thumbnailUrl || view.primaryImageUrl;
    
    view.variants = VariantView.fromEntities(variants);
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(
    entities: (ProductEntity & { variants?: ProductVariantEntity[]; images?: ProductImage[] })[],
  ): ProductView[] {
    return entities.map((entity) =>
      ProductView.fromEntity(entity, entity.variants ?? [], entity.images ?? []),
    );
  }
}
