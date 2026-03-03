import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { CATALOG_EVENTS } from '@shared/events';
import {
  ProductNotFoundError,
  ProductSkuAlreadyExistsError,
  ProductSlugAlreadyExistsError,
  CategoryNotFoundError,
  ProductVariantNotFoundError,
  InvalidProductOperationError,
  ProductVersionConflictError,
} from '@shared/domain/errors';
import { ProductRepository } from '../repositories/product.repository';
import { ProductVariantRepository } from '../repositories/product-variant.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductImageRepository } from '../repositories/product-image.repository';
import { ProductEntity, ProductStatus, ProductType } from '../entities/product.entity';
import { ProductVariantEntity } from '../entities/product-variant.entity';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductStatusChangedEvent,
  ProductVariantCreatedEvent,
} from '../events';

@Injectable()
export class ProductService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly productRepo: ProductRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly imageRepo: ProductImageRepository,
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
    categoryId?: string | null,
    isFeatured?: boolean,
    metadata?: Record<string, unknown> | null,
    createdBy?: string,
  ): Promise<ProductEntity> {
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

    if (categoryId) {
      const category = await this.categoryRepo.findById(categoryId);
      if (!category) {
        throw new CategoryNotFoundError(categoryId);
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
      categoryId,
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
      categoryId: string | null;
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
      categoryId: string | null;
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
      attributes: Record<string, string>;
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

    const variant = await this.variantRepo.create({
      productId,
      sku: data.sku,
      name: data.name,
      price: data.price ?? null,
      compareAtPrice: data.compareAtPrice ?? null,
      costPrice: data.costPrice ?? null,
      quantity: data.quantity ?? 1,
      attributes: data.attributes,
      isDefault: data.isDefault ?? false,
      createdBy: data.createdBy,
    });

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
}
