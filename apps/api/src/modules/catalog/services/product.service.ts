import { Injectable, Optional, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { CATALOG_EVENTS } from '@shared/events';
import {
  ProductNotFoundError,
  ProductSkuAlreadyExistsError,
  ProductSlugAlreadyExistsError,
  ProductVariantNotFoundError,
  InvalidProductOperationError,
  ProductVersionConflictError,
  CatalogProductLimitReachedError,
  CellNotFoundError,
} from '@shared/domain/errors';
import { ProductRepository } from '../repositories/product.repository';
import { ProductVariantRepository } from '../repositories/product-variant.repository';
import { ProductImageRepository } from '../repositories/product-image.repository';
import { ProductEntity, ProductStatus, ProductType } from '../entities/product.entity';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import { ProductImageEntity } from '../entities/product-image.entity';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductStatusChangedEvent,
  ProductVariantCreatedEvent,
  ProductVariantUpdatedEvent,
  ProductVariantDeletedEvent,
} from '../events';
import { VariantAttributeService } from '@modules/catalog-attributes/services/variant-attribute.service';
import { CellRepository } from '@modules/cell';

interface AttributeValue {
  attributeId: string;
  numberValue?: number | null;
  textValue?: string | null;
  optionId?: string | null;
}

@Injectable()
export class ProductService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly productRepo: ProductRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly imageRepo: ProductImageRepository,
    private readonly configService: ConfigService,
    @Optional() private readonly variantAttributeService?: VariantAttributeService,
    @Optional() private readonly cellRepo?: CellRepository,
  ) {
    super(eventEmitter);
  }

  async create(
    sku: string | null,
    name: string,
    slug: string,
    description?: string | null,
    type?: ProductType,
    price?: number | null,
    compareAtPrice?: number | null,
    costPrice?: number | null,
    currency?: string,
    quantity?: number,
    cellId?: string | null,
    isFeatured?: boolean,
    metadata?: Record<string, unknown> | null,
    createdBy?: string,
  ): Promise<ProductEntity> {
    // Check product limit before creating
    const productLimit = this.configService.get<number>('catalog.productLimit', 25000);
    const totalProducts = await this.productRepo.countAll();

    if (totalProducts >= productLimit) {
      throw new CatalogProductLimitReachedError(productLimit);
    }

    if (sku) {
      const existingSku = await this.productRepo.findBySku(sku);
      if (existingSku) {
        throw new ProductSkuAlreadyExistsError(sku);
      }
    }

    const existingSlug = await this.productRepo.findBySlug(slug);
    if (existingSlug) {
      throw new ProductSlugAlreadyExistsError(slug);
    }

    if (cellId && this.cellRepo) {
      const cell = await this.cellRepo.findById(cellId);
      if (!cell) {
        throw new CellNotFoundError(cellId);
      }
    }

    const product = await this.productRepo.create({
      sku,
      name,
      slug,
      description,
      type: type ?? ProductType.SIMPLE,
      status: ProductStatus.DRAFT,
      price,
      compareAtPrice,
      costPrice,
      currency,
      quantity,
      cellId,
      isFeatured,
      metadata,
      createdBy,
    });

    this.emit(
      CATALOG_EVENTS.PRODUCT_CREATED,
      new ProductCreatedEvent(
        product.id,
        product.sku,
        product.name,
        product.slug,
        product.type,
        product.status,
      ),
    );

    return product;
  }

  async findById(id: string): Promise<ProductEntity> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }

  async findBySku(sku: string): Promise<ProductEntity | null> {
    return this.productRepo.findBySku(sku);
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    return this.productRepo.findBySlug(slug);
  }

  async findBySlugWithDetails(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    status: string;
    price: number | null;
    compareAtPrice: number | null;
    currency: string;
    quantity: number;
    isFeatured: boolean;
    cell: {
      id: string;
      name: string;
      slug: string;
      category: {
        id: string;
        name: string;
        slug: string;
        path: string;
      };
    } | null;
    variants: {
      id: string;
      sku: string;
      name: string;
      price: number | null;
      compareAtPrice: number | null;
      quantity: number;
      isDefault: boolean;
      sortOrder: number;
      images: { url: string; altText: string | null; isPrimary: boolean }[];
      attributeValues: {
        id: string;
        numberValue: number | null;
        textValue: string | null;
        booleanValue: boolean | null;
        attribute: {
          id: string;
          name: string;
          slug: string;
          dataType: string;
          unit: { symbol: string } | null;
        };
        option: { id: string; label: string; value: string } | null;
      }[];
    }[];
    images: { url: string; altText: string | null; isPrimary: boolean }[];
  } | null> {
    return this.productRepo.findBySlugWithDetails(slug);
  }

  async findAll(): Promise<ProductEntity[]> {
    return this.productRepo.findAll();
  }

  async findActive(): Promise<ProductEntity[]> {
    return this.productRepo.findActive();
  }

  async findByCategoryId(categoryId: string): Promise<ProductEntity[]> {
    return this.productRepo.findByCategoryId(categoryId);
  }

  async update(
    id: string,
    data: Partial<{
      sku: string | null;
      name: string;
      slug: string;
      description: string | null;
      type: ProductType;
      status: ProductStatus;
      price: number | null;
      compareAtPrice: number | null;
      costPrice: number | null;
      currency: string;
      quantity: number;
      cellId: string | null;
      isFeatured: boolean;
      metadata: Record<string, unknown> | null;
      updatedBy: string;
    }>,
  ): Promise<ProductEntity> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data)) {
      const typedKey = key as keyof typeof data;
      if (data[typedKey] !== undefined) {
        changes[key] = {
          from: product[typedKey as keyof ProductEntity],
          to: data[typedKey],
        };
      }
    }

    const updatedProduct = await this.productRepo.update(id, data);

    this.emit(
      CATALOG_EVENTS.PRODUCT_UPDATED,
      new ProductUpdatedEvent(product.id, changes),
    );

    return updatedProduct;
  }

  async updateWithOptimisticLock(
    id: string,
    data: Partial<{
      sku: string | null;
      name: string;
      slug: string;
      description: string | null;
      type: ProductType;
      status: ProductStatus;
      price: number | null;
      compareAtPrice: number | null;
      costPrice: number | null;
      currency: string;
      quantity: number;
      cellId: string | null;
      isFeatured: boolean;
      metadata: Record<string, unknown> | null;
      updatedBy: string;
    }>,
    expectedVersion: number,
  ): Promise<ProductEntity> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    if (product.version !== expectedVersion) {
      throw new ProductVersionConflictError(id);
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data)) {
      const typedKey = key as keyof typeof data;
      if (data[typedKey] !== undefined) {
        changes[key] = {
          from: product[typedKey as keyof ProductEntity],
          to: data[typedKey],
        };
      }
    }

    const updatedProduct = await this.productRepo.update(id, data);

    this.emit(
      CATALOG_EVENTS.PRODUCT_UPDATED,
      new ProductUpdatedEvent(product.id, changes),
    );

    return updatedProduct;
  }

  async bulkUpdate(
    ids: string[],
    data: Partial<{
      status: ProductStatus;
      price: number | null;
      quantity: number;
      cellId: string | null;
      isFeatured: boolean;
    }>,
  ): Promise<{ updatedCount: number }> {
    const products = await this.productRepo.findByIds(ids);
    if (products.length === 0) {
      throw new ProductNotFoundError('No products found for given IDs');
    }

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.cellId !== undefined) updateData.cellId = data.cellId;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;

    const updatedCount = await this.productRepo.updateMany(ids, updateData as any);

    for (const product of products) {
      this.emit(
        CATALOG_EVENTS.PRODUCT_UPDATED,
        new ProductUpdatedEvent(product.id, { bulk: { from: null, to: data } }),
      );
    }

    return { updatedCount };
  }

  async changeStatus(id: string, newStatus: ProductStatus): Promise<ProductEntity> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    const validTransitions: Record<ProductStatus, ProductStatus[]> = {
      [ProductStatus.DRAFT]: [ProductStatus.ACTIVE, ProductStatus.ARCHIVED],
      [ProductStatus.ACTIVE]: [ProductStatus.ARCHIVED],
      [ProductStatus.ARCHIVED]: [ProductStatus.DRAFT, ProductStatus.ACTIVE],
    };

    const isValidTransition = validTransitions[product.status]?.includes(newStatus);
    if (!isValidTransition) {
      throw new InvalidProductOperationError(
        `Cannot change product status from ${product.status} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    const oldStatus = product.status;
    const updatedProduct = await this.productRepo.update(id, {
      status: newStatus,
    });

    this.emit(
      CATALOG_EVENTS.PRODUCT_STATUS_CHANGED,
      new ProductStatusChangedEvent(product.id, oldStatus, newStatus),
    );

    return updatedProduct;
  }

  async addVariant(
    productId: string,
    data: {
      sku: string;
      name: string;
      price?: number | null;
      compareAtPrice?: number | null;
      costPrice?: number | null;
      quantity?: number;
      attributes?: Record<string, string> | AttributeValue[];
      isDefault?: boolean;
      createdBy?: string;
    },
  ): Promise<ProductVariantEntity> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    if (product.type !== ProductType.VARIABLE) {
      throw new InvalidProductOperationError(
        'Cannot add variant to simple product',
        'PRODUCT_MUST_BE_VARIABLE',
      );
    }

    const existingVariant = await this.variantRepo.findBySku(data.sku);
    if (existingVariant) {
      throw new ProductSkuAlreadyExistsError(data.sku);
    }

    // Check existing variants to determine default status
    const existingVariants = await this.variantRepo.findByProductId(productId);
    const isFirstVariant = existingVariants.length === 0;
    const shouldBeDefault = data.isDefault ?? isFirstVariant;

    // If this variant should be default, unset any existing default
    if (shouldBeDefault && !isFirstVariant) {
      const currentDefault = await this.variantRepo.findDefaultVariant(productId);
      if (currentDefault) {
        await this.variantRepo.update(currentDefault.id, { isDefault: false });
      }
    }

    const variant = await this.variantRepo.create({
      productId,
      sku: data.sku,
      name: data.name,
      price: data.price ?? null,
      compareAtPrice: data.compareAtPrice ?? null,
      costPrice: data.costPrice ?? null,
      quantity: data.quantity ?? 1,
      attributes: data.attributes as Record<string, string> ?? {},
      isDefault: shouldBeDefault,
      createdBy: data.createdBy,
    });

    // Assign structured attributes if provided and VariantAttributeService is available
    if (data.attributes && Array.isArray(data.attributes) && this.variantAttributeService) {
      try {
        await this.variantAttributeService.assignAttributes(variant.id, data.attributes);
      } catch (error) {
        // Rollback variant creation if attribute assignment fails
        await this.variantRepo.delete(variant.id);
        throw error;
      }
    }

    this.emit(
      CATALOG_EVENTS.PRODUCT_VARIANT_CREATED,
      new ProductVariantCreatedEvent(
        variant.id,
        variant.productId,
        variant.sku,
        variant.name,
      ),
    );

    return variant;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    data: {
      sku?: string;
      name?: string;
      price?: number | null;
      compareAtPrice?: number | null;
      costPrice?: number | null;
      quantity?: number;
      attributes?: Record<string, string> | AttributeValue[];
      isDefault?: boolean;
      updatedBy?: string;
    },
  ): Promise<ProductVariantEntity> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const variant = await this.variantRepo.findById(variantId);
    if (!variant) {
      throw new ProductVariantNotFoundError(variantId);
    }

    if (variant.productId !== productId) {
      throw new InvalidProductOperationError(
        'Variant does not belong to this product',
        'VARIANT_PRODUCT_MISMATCH',
      );
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (data.sku !== undefined && data.sku !== variant.sku) {
      const existingVariant = await this.variantRepo.findBySku(data.sku);
      if (existingVariant && existingVariant.id !== variantId) {
        throw new ProductSkuAlreadyExistsError(data.sku);
      }
      changes.sku = { from: variant.sku, to: data.sku };
    }

    if (data.name !== undefined && data.name !== variant.name) {
      changes.name = { from: variant.name, to: data.name };
    }

    if (data.price !== undefined) {
      changes.price = { from: variant.price, to: data.price };
    }

    if (data.compareAtPrice !== undefined) {
      changes.compareAtPrice = { from: variant.compareAtPrice, to: data.compareAtPrice };
    }

    if (data.costPrice !== undefined) {
      changes.costPrice = { from: variant.costPrice, to: data.costPrice };
    }

    if (data.quantity !== undefined) {
      changes.quantity = { from: variant.quantity, to: data.quantity };
    }

    if (data.isDefault !== undefined && data.isDefault !== variant.isDefault) {
      if (data.isDefault) {
        const currentDefault = await this.variantRepo.findDefaultVariant(productId);
        if (currentDefault && currentDefault.id !== variantId) {
          await this.variantRepo.update(currentDefault.id, { isDefault: false });
        }
      }
      changes.isDefault = { from: variant.isDefault, to: data.isDefault };
    }

    const updateData: Partial<{
      sku: string;
      name: string;
      price: number | null;
      compareAtPrice: number | null;
      costPrice: number | null;
      quantity: number;
      attributes: Record<string, string>;
      isDefault: boolean;
      updatedBy: string;
    }> = {};

    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    const updatedVariant = await this.variantRepo.update(variantId, updateData);

    if (Object.keys(changes).length > 0) {
      this.emit(
        CATALOG_EVENTS.PRODUCT_VARIANT_UPDATED,
        new ProductVariantUpdatedEvent(variant.id, variant.productId, changes),
      );
    }

    return updatedVariant;
  }

  async removeVariant(productId: string, variantId: string): Promise<void> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const variant = await this.variantRepo.findById(variantId);
    if (!variant) {
      throw new ProductVariantNotFoundError(variantId);
    }

    if (variant.productId !== productId) {
      throw new InvalidProductOperationError(
        'Variant does not belong to this product',
        'VARIANT_PRODUCT_MISMATCH',
      );
    }

    await this.variantRepo.delete(variantId);

    this.emit(
      CATALOG_EVENTS.PRODUCT_VARIANT_DELETED,
      new ProductVariantDeletedEvent(variant.id, variant.productId),
    );
  }

  async delete(id: string): Promise<void> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    await this.imageRepo.deleteByProductId(id);

    const variants = await this.variantRepo.findByProductId(id);
    for (const variant of variants) {
      await this.variantRepo.delete(variant.id);
    }

    await this.productRepo.delete(id);
  }

  async findAllPaginated(options: {
    search?: string;
    categoryId?: string;
    cellId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ products: ProductEntity[]; total: number }> {
    return this.productRepo.findAllWithSearch(options);
  }

  async getVariants(productId: string): Promise<ProductVariantEntity[]> {
    return this.variantRepo.findByProductId(productId);
  }

  async findVariantBySku(sku: string): Promise<ProductVariantEntity | null> {
    return this.variantRepo.findBySku(sku);
  }

  async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (await this.productRepo.findBySlug(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
    return slug;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async addVariantImage(
    productId: string,
    variantId: string,
    url: string,
    altText?: string,
    sortOrder?: number,
  ): Promise<ProductImageEntity> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const variant = await this.variantRepo.findById(variantId);
    if (!variant) {
      throw new ProductVariantNotFoundError(variantId);
    }

    if (variant.productId !== productId) {
      throw new InvalidProductOperationError(
        'Variant does not belong to this product',
        'VARIANT_PRODUCT_MISMATCH',
      );
    }

    return this.imageRepo.create({
      productId,
      variantId,
      url,
      altText: altText ?? null,
      sortOrder: sortOrder ?? 1,
      isPrimary: false,
    });
  }

  async updateImage(
    imageId: string,
    data: { altText?: string; sortOrder?: number; isPrimary?: boolean },
  ): Promise<ProductImageEntity> {
    const image = await this.imageRepo.findById(imageId);
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    return this.imageRepo.update(imageId, data);
  }

  async removeImage(imageId: string): Promise<void> {
    await this.imageRepo.delete(imageId);
  }

  async getVariantImages(variantId: string): Promise<ProductImageEntity[]> {
    return this.imageRepo.findByVariantId(variantId);
  }
}
