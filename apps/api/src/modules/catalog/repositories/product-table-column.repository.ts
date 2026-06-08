import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { ProductTableColumnEntity } from '../entities/product-table-column.entity';

export interface ProductTableColumnWithDetails extends ProductTableColumnEntity {
  product: {
    id: string;
    name: string;
    sku: string | null;
  };
  attribute: {
    id: string;
    name: string;
    slug: string;
    dataType: string;
  };
}

@Injectable()
export class ProductTableColumnRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findByProductId(productId: string): Promise<ProductTableColumnEntity[]> {
    return this.getClient().productTableColumn.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });
  }

  async findByProductIdWithDetails(productId: string): Promise<ProductTableColumnWithDetails[]> {
    return this.getClient().productTableColumn.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        attribute: {
          select: {
            id: true,
            name: true,
            slug: true,
            dataType: true,
          },
        },
      },
    }) as any;
  }

  async findByAttributeId(attributeId: string): Promise<ProductTableColumnEntity[]> {
    return this.getClient().productTableColumn.findMany({
      where: { attributeId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<ProductTableColumnEntity | null> {
    return this.getClient().productTableColumn.findUnique({
      where: { id },
    });
  }

  async findByPosition(productId: string, position: number): Promise<ProductTableColumnEntity | null> {
    return this.getClient().productTableColumn.findUnique({
      where: {
        productId_position: {
          productId,
          position,
        },
      },
    });
  }

  async create(data: {
    productId: string;
    attributeId: string;
    position: number;
  }): Promise<ProductTableColumnEntity> {
    return this.getClient().productTableColumn.create({
      data,
    });
  }

  async createMany(data: Array<{
    productId: string;
    attributeId: string;
    position: number;
  }>): Promise<{ count: number }> {
    const result = await this.getClient().productTableColumn.createMany({
      data,
      skipDuplicates: true,
    });
    return result;
  }

  async update(
    id: string,
    data: Partial<{
      attributeId: string;
      position: number;
    }>,
  ): Promise<ProductTableColumnEntity> {
    return this.getClient().productTableColumn.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ProductTableColumnEntity> {
    return this.getClient().productTableColumn.delete({
      where: { id },
    });
  }

  async deleteByProductId(productId: string): Promise<{ count: number }> {
    const result = await this.getClient().productTableColumn.deleteMany({
      where: { productId },
    });
    return result;
  }

  async countByProductId(productId: string): Promise<number> {
    return this.getClient().productTableColumn.count({
      where: { productId },
    });
  }

  async getMaxPosition(productId: string): Promise<number> {
    const result = await this.getClient().productTableColumn.aggregate({
      where: { productId },
      _max: {
        position: true,
      },
    });
    return result._max.position ?? 0;
  }

  async reorderColumns(productId: string, attributeIds: string[]): Promise<void> {
    await this.db.$transaction(async (prisma) => {
      for (let i = 0; i < attributeIds.length; i++) {
        await prisma.productTableColumn.updateMany({
          where: {
            productId,
            attributeId: attributeIds[i],
          },
          data: {
            position: i + 1,
          },
        });
      }
    });
  }
}
