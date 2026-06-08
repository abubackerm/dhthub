import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '../../../core/database/database.provider';
import { transactionContext } from '../../../core/database/transaction-context.store';

export interface CategoryImageEntity {
  id: string;
  categoryId: string;
  sku: string;
  storagePath: string;
  position: number;
  altText: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CategoryImageRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findByCategoryId(categoryId: string): Promise<CategoryImageEntity[]> {
    return this.getClient().categoryImage.findMany({
      where: { categoryId },
      orderBy: { position: 'asc' },
    });
  }

  async findBySku(sku: string): Promise<CategoryImageEntity[]> {
    return this.getClient().categoryImage.findMany({
      where: { sku },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string): Promise<CategoryImageEntity | null> {
    return this.getClient().categoryImage.findUnique({
      where: { id },
    });
  }

  async findPrimaryByCategoryId(categoryId: string): Promise<CategoryImageEntity | null> {
    return this.getClient().categoryImage.findFirst({
      where: { categoryId, isPrimary: true },
    });
  }

  async create(data: {
    categoryId: string;
    sku: string;
    storagePath: string;
    position: number;
    altText?: string | null;
    isPrimary?: boolean;
  }): Promise<CategoryImageEntity> {
    return this.getClient().categoryImage.create({
      data: {
        categoryId: data.categoryId,
        sku: data.sku,
        storagePath: data.storagePath,
        position: data.position,
        altText: data.altText,
        isPrimary: data.isPrimary ?? false,
      },
    });
  }

  async upsert(
    categoryId: string,
    position: number,
    storagePath: string,
    sku: string,
    altText?: string | null,
  ): Promise<CategoryImageEntity> {
    return this.getClient().categoryImage.upsert({
      where: {
        categoryId_position: {
          categoryId,
          position
        }
      },
      update: {
        storagePath,
        sku,
        altText,
        updatedAt: new Date()
      },
      create: {
        categoryId,
        sku,
        storagePath,
        position,
        altText,
        isPrimary: position === 1
      }
    });
  }

  async update(
    id: string,
    data: Partial<{
      storagePath: string;
      altText: string | null;
      isPrimary: boolean;
      position: number;
    }>,
  ): Promise<CategoryImageEntity> {
    return this.getClient().categoryImage.update({
      where: { id },
      data,
    });
  }

  async deleteByCategoryId(categoryId: string): Promise<{ count: number }> {
    return this.getClient().categoryImage.deleteMany({
      where: { categoryId },
    });
  }

  async delete(id: string): Promise<CategoryImageEntity> {
    return this.getClient().categoryImage.delete({
      where: { id },
    });
  }
}
