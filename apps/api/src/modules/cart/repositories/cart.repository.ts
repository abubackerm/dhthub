import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { CartEntity } from '../entities/cart.entity';
import { ProductVariantEntity } from '../../catalog/entities/product-variant.entity';

export interface CartWithItems extends CartEntity {
  items: Array<{
    id: string;
    cartId: string;
    variantId: string;
    qty: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    variant: ProductVariantEntity;
  }>;
}

@Injectable()
export class CartRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findByUserId(userId: string): Promise<CartEntity | null> {
    return this.getClient().cart.findUnique({
      where: { userId },
    });
  }

  async findById(id: string): Promise<CartEntity | null> {
    return this.getClient().cart.findUnique({
      where: { id },
    });
  }

  async findByIdWithItems(id: string): Promise<CartWithItems | null> {
    return this.getClient().cart.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    }) as unknown as CartWithItems | null;
  }

  async findByUserIdWithItems(userId: string): Promise<CartWithItems | null> {
    return this.getClient().cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    }) as unknown as CartWithItems | null;
  }

  async create(
    data: {
      userId: string;
      createdBy?: string;
    },
  ): Promise<CartEntity> {
    return this.getClient().cart.create({
      data: {
        userId: data.userId,
        createdBy: data.createdBy,
      },
    });
  }

  async markSubmitted(id: string): Promise<CartEntity> {
    return this.getClient().cart.update({
      where: { id },
      data: { submittedAt: new Date() },
    });
  }

  async delete(id: string): Promise<CartEntity> {
    return this.getClient().cart.delete({
      where: { id },
    });
  }

  async deleteByUserId(userId: string): Promise<CartEntity> {
    return this.getClient().cart.delete({
      where: { userId },
    });
  }
}
