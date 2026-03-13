import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { ProductVariantEntity } from '../entities/product-variant.entity';

@Injectable()
export class ProductVariantRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<ProductVariantEntity | null> {
    return this.getClient().productVariant.findUnique({
      where: { id },
    });
  }

  async findByIdWithAttributes(id: string): Promise<ProductVariantEntity | null> {
    return this.getClient().productVariant.findUnique({
      where: { id },
      include: {
        attributeValues: {
          include: {
            attribute: {
              include: {
                unit: true,
              },
            },
            option: true,
          },
        },
      },
    });
  }

  async findByProductId(productId: string): Promise<ProductVariantEntity[]> {
    return this.getClient().productVariant.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByProductIdWithAttributes(productId: string): Promise<ProductVariantEntity[]> {
    return this.getClient().productVariant.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
      include: {
        attributeValues: {
          include: {
            attribute: {
              include: {
                unit: true,
              },
            },
            option: true,
          },
        },
      },
    });
  }

  async findDefaultVariant(productId: string): Promise<ProductVariantEntity | null> {
    return this.getClient().productVariant.findFirst({
      where: { productId, isDefault: true },
    });
  }

  async findBySku(sku: string): Promise<ProductVariantEntity | null> {
    return this.getClient().productVariant.findUnique({
      where: { sku },
    });
  }

  async findBySkuWithAttributes(sku: string): Promise<ProductVariantEntity | null> {
    return this.getClient().productVariant.findUnique({
      where: { sku },
      include: {
        attributeValues: {
          include: {
            attribute: {
              include: {
                unit: true,
              },
            },
            option: true,
          },
        },
      },
    });
  }

  async create(data: {
    productId: string;
    sku: string;
    name: string;
    price?: number | null;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    quantity?: number;
    attributes: Record<string, string>;
    isDefault?: boolean;
    createdBy?: string;
  }): Promise<ProductVariantEntity> {
    return this.getClient().productVariant.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        name: data.name,
        price: data.price ?? null,
        compareAtPrice: data.compareAtPrice ?? null,
        costPrice: data.costPrice ?? null,
        quantity: data.quantity ?? 1,
        attributes: data.attributes,
        isDefault: data.isDefault ?? false,
        createdBy: data.createdBy,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      sku: string;
      name: string;
      price: number | null;
      compareAtPrice: number | null;
      costPrice: number | null;
      quantity: number;
      attributes: Record<string, string>;
      isDefault: boolean;
      updatedBy: string;
    }>,
  ): Promise<ProductVariantEntity> {
    const updateData: Record<string, unknown> = {};
    
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice;
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.attributes !== undefined) updateData.attributes = data.attributes;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;
    
    updateData.version = { increment: 1 };

    return this.getClient().productVariant.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<ProductVariantEntity> {
    return this.getClient().productVariant.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().productVariant.count({ where });
  }

  async findAll(where?: Record<string, unknown>): Promise<ProductVariantEntity[]> {
    return this.getClient().productVariant.findMany({ where });
  }

  async findByIds(ids: string[]): Promise<ProductVariantEntity[]> {
    return this.getClient().productVariant.findMany({
      where: { id: { in: ids } },
    });
  }
}
