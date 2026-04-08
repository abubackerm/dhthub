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

  async findById(id: string): Promise<CartEntity | null> {
    return this.getClient().cart.findUnique({
      where: { id },
    });
  }

  async findActiveByUserId(userId: string): Promise<CartEntity | null> {
    return this.getClient().cart.findFirst({
      where: { userId, isActive: true },
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

  async findActiveByUserIdWithItems(userId: string): Promise<CartWithItems | null> {
    return this.getClient().cart.findFirst({
      where: { userId, isActive: true },
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

  async getOrCreateActiveCart(userId: string): Promise<CartEntity> {
    const existing = await this.findActiveByUserId(userId);
    if (existing) return existing;

    return this.getClient().cart.create({
      data: {
        userId,
        isActive: true,
      },
    });
  }

  async createActiveCart(userId: string): Promise<CartEntity> {
    return this.getClient().cart.create({
      data: {
        userId,
        isActive: true,
      },
    });
  }

  async markAsInactive(id: string): Promise<CartEntity> {
    return this.getClient().cart.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async markSubmitted(id: string): Promise<CartEntity> {
    return this.getClient().cart.update({
      where: { id },
      data: {
        submittedAt: new Date(),
        isActive: false,
        status: 'SUBMITTED',
      },
    });
  }

  async delete(id: string): Promise<CartEntity> {
    return this.getClient().cart.delete({
      where: { id },
    });
  }
}
