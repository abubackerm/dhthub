interface SimpleProductImage {
  url: string;
  altText: string | null;
  isPrimary: boolean;
}

export class SimpleProductView {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: number | null;
  quantity: number;
  isFeatured: boolean;
  status: string;
  images: SimpleProductImage[];
  attributeValues: any[];
  defaultVariantId: string | null;
  cellId: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: any): SimpleProductView {
    const view = new SimpleProductView();
    view.id = entity.id;
    view.name = entity.name;
    view.slug = entity.slug;
    view.sku = entity.sku;
    view.description = entity.description;
    view.price = entity.price;
    view.quantity = entity.quantity ?? 0;
    view.isFeatured = entity.isFeatured;
    view.status = entity.status;
    view.cellId = entity.cellId;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;

    // Pick the default variant ID
    if (entity.variants && entity.variants.length > 0) {
      const defaultVariant = entity.variants.find((v: any) => v.isDefault) || entity.variants[0];
      view.defaultVariantId = defaultVariant.id;
    } else {
      view.defaultVariantId = null;
    }

    // Normalize and include product-level images (variantId is null)
    view.images = (entity.images || [])
      .filter((img: any) => !img.variantId)
      .map((img: any) => {
        let url = img.url || img.storagePath || '';
        if (url.startsWith('http')) {
          const parsed = new URL(url);
          url = parsed.pathname;
        }
        if (url.startsWith('/catalog')) {
          url = url.replace('/catalog', '');
        }
        return {
          url,
          altText: img.altText || null,
          isPrimary: img.isPrimary || false,
        };
      });

    // Fallback to first variant image if no product-level images
    if (view.images.length === 0 && entity.variants) {
      for (const variant of entity.variants) {
        const variantImages = (variant.variantImages || variant.images || [])
          .map((img: any) => {
            let url = img.url || img.storagePath || '';
            if (url.startsWith('http')) {
              const parsed = new URL(url);
              url = parsed.pathname;
            }
            if (url.startsWith('/catalog')) {
              url = url.replace('/catalog', '');
            }
            return { url, altText: img.altText || null, isPrimary: img.isPrimary || false };
          });
        view.images.push(...variantImages);
        if (view.images.length > 0) break;
      }
    }

    // Map attribute values
    view.attributeValues = (entity.attributeValues || []).map((av: any) => ({
      id: av.id,
      productId: av.productId,
      attributeId: av.attributeId,
      rawValue: av.rawValue,
      numberValue: av.numberValue,
      textValue: av.textValue,
      optionId: av.optionId,
      booleanValue: av.booleanValue,
      createdAt: av.createdAt,
      updatedAt: av.updatedAt,
      attribute: av.attribute ? {
        id: av.attribute.id,
        name: av.attribute.name,
        slug: av.attribute.slug,
        dataType: av.attribute.dataType,
        group: av.attribute.group,
        sortOrder: av.attribute.sortOrder,
        filterType: av.attribute.filterType,
        isFilterable: av.attribute.isFilterable,
        isRequired: av.attribute.isRequired,
        unitId: av.attribute.unitId,
        unitName: av.attribute.unitName,
        createdAt: av.attribute.createdAt,
        updatedAt: av.attribute.updatedAt,
      } : null,
      option: av.option ? {
        id: av.option.id,
        attributeId: av.option.attributeId,
        label: av.option.label,
        value: av.option.value,
        sortOrder: av.option.sortOrder,
        createdAt: av.option.createdAt,
      } : null,
    }));

    return view;
  }

  static fromEntities(entities: any[]): SimpleProductView[] {
    return entities.map((entity) => SimpleProductView.fromEntity(entity));
  }
}
