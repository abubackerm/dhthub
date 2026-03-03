import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { ProductImageEntity } from '../entities/product-image.entity';

@Injectable()
export class ProductImageRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<ProductImageEntity | null> {
    return this.getClient().productImage.findUnique({
      where: { id },
    });
  }

  async findByProductId(productId: string): Promise<ProductImageEntity[]> {
    return this.getClient().productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByVariantId(variantId: string): Promise<ProductImageEntity[]> {
    return this.getClient().productImage.findMany({
      where: { variantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findPrimaryImage(productId: string): Promise<ProductImageEntity | null> {
    return this.getClient().productImage.findFirst({
      where: { productId, isPrimary: true },
    });
  }

  async create(data: {
    productId: string;
    variantId?: string | null;
    url: string;
    altText?: string | null;
    sortOrder?: number;
    isPrimary?: boolean;
    createdBy?: string;
  }): Promise<ProductImageEntity> {
    return this.getClient().productImage.create({
      data: {
        productId: data.productId,
        variantId: data.variantId ?? null,
        url: data.url,
        altText: data.altText ?? null,
        sortOrder: data.sortOrder ?? 1,
        isPrimary: data.isPrimary ?? false,
        createdBy: data.createdBy,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      variantId: string | null;
      url: string;
      altText: string | null;
      sortOrder: number;
      isPrimary: boolean;
      updatedBy: string;
    }>,
  ): Promise<ProductImageEntity> {
    return this.getClient().productImage.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ProductImageEntity> {
    return this.getClient().productImage.delete({
      where: { id },
    });
  }

  async deleteByProductId(productId: string): Promise<{ count: number }> {
    return this.getClient().productImage.deleteMany({
      where: { productId },
    });
  }
}
