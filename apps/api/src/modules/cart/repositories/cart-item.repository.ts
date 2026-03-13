import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { CartItemEntity } from '../entities/cart-item.entity';

@Injectable()
export class CartItemRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findByCartId(cartId: string): Promise<CartItemEntity[]> {
    return this.getClient().cartItem.findMany({
      where: { cartId },
      include: {
        variant: true,
      },
    });
  }

  async findByCartIdWithDetails(cartId: string) {
    return this.getClient().cartItem.findMany({
      where: { cartId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByCartAndVariant(
    cartId: string,
    variantId: string,
  ): Promise<CartItemEntity | null> {
    return this.getClient().cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId,
          variantId,
        },
      },
    });
  }

  async findById(id: string): Promise<CartItemEntity | null> {
    return this.getClient().cartItem.findUnique({
      where: { id },
      include: {
        variant: true,
      },
    });
  }

  async create(
    data: {
      cartId: string;
      variantId: string;
      qty: number;
      createdBy?: string;
    },
  ): Promise<CartItemEntity> {
    return this.getClient().cartItem.create({
      data: {
        cartId: data.cartId,
        variantId: data.variantId,
        qty: data.qty,
        createdBy: data.createdBy,
      },
      include: {
        variant: true,
      },
    });
  }

  async updateQty(
    id: string,
    qty: number,
    updatedBy?: string,
  ): Promise<CartItemEntity> {
    return this.getClient().cartItem.update({
      where: { id },
      data: {
        qty,
        updatedBy,
      },
      include: {
        variant: true,
      },
    });
  }

  async delete(id: string): Promise<CartItemEntity> {
    return this.getClient().cartItem.delete({
      where: { id },
    });
  }

  async deleteByCartId(cartId: string): Promise<{ count: number }> {
    return this.getClient().cartItem.deleteMany({
      where: { cartId },
    });
  }

  async countByCartId(cartId: string): Promise<number> {
    return this.getClient().cartItem.count({
      where: { cartId },
    });
  }
}
