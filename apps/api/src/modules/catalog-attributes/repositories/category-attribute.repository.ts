import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { CategoryAttributeEntity } from '../entities';

@Injectable()
export class CategoryAttributeRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<CategoryAttributeEntity | null> {
    return this.getClient().categoryAttribute.findUnique({
      where: { id },
    });
  }

  async findByCategoryId(categoryId: string): Promise<CategoryAttributeEntity[]> {
    return this.getClient().categoryAttribute.findMany({
      where: { categoryId },
      include: {
        attribute: true,
      },
    });
  }

  async create(data: {
    categoryId: string;
    attributeId: string;
  }): Promise<CategoryAttributeEntity> {
    return this.getClient().categoryAttribute.create({
      data,
    });
  }

  async delete(id: string): Promise<CategoryAttributeEntity> {
    return this.getClient().categoryAttribute.delete({
      where: { id },
    });
  }

  async deleteByCategoryId(categoryId: string): Promise<{ count: number }> {
    return this.getClient().categoryAttribute.deleteMany({
      where: { categoryId },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().categoryAttribute.count({ where });
  }
}
