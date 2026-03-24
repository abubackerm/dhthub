import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { EnquiryItemEntity } from '../entities/enquiry-item.entity';

@Injectable()
export class EnquiryItemRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findByEnquiryId(enquiryId: string): Promise<EnquiryItemEntity[]> {
    return this.getClient().enquiryItem.findMany({
      where: { enquiryId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByEnquiryIdWithDetails(enquiryId: string) {
    return this.getClient().enquiryItem.findMany({
      where: { enquiryId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<EnquiryItemEntity | null> {
    return this.getClient().enquiryItem.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async create(
    data: {
      enquiryId: string;
      variantId: string;
      qty: number;
      createdBy?: string;
    },
  ): Promise<EnquiryItemEntity> {
    return this.getClient().enquiryItem.create({
      data: {
        enquiryId: data.enquiryId,
        variantId: data.variantId,
        qty: data.qty,
        createdBy: data.createdBy,
      },
      include: {
        variant: true,
      },
    });
  }

  async createMany(
    items: Array<{
      enquiryId: string;
      variantId: string;
      qty: number;
      createdBy?: string;
    }>,
  ): Promise<{ count: number }> {
    return this.getClient().enquiryItem.createMany({
      data: items.map((item) => ({
        enquiryId: item.enquiryId,
        variantId: item.variantId,
        qty: item.qty,
        createdBy: item.createdBy,
      })),
    });
  }

  async delete(id: string): Promise<EnquiryItemEntity> {
    return this.getClient().enquiryItem.delete({
      where: { id },
    });
  }

  async deleteByEnquiryId(
    enquiryId: string,
  ): Promise<{ count: number }> {
    return this.getClient().enquiryItem.deleteMany({
      where: { enquiryId },
    });
  }

  async countByEnquiryId(enquiryId: string): Promise<number> {
    return this.getClient().enquiryItem.count({
      where: { enquiryId },
    });
  }

  async createWithDetails(
    data: {
      enquiryId: string;
      variantId: string;
      productId: string;
      sku: string;
      qty: number;
      createdBy?: string;
    },
  ): Promise<EnquiryItemEntity> {
    return this.getClient().enquiryItem.create({
      data: {
        enquiryId: data.enquiryId,
        variantId: data.variantId,
        productId: data.productId,
        sku: data.sku,
        qty: data.qty,
        createdBy: data.createdBy,
      },
      include: {
        variant: true,
      },
    });
  }

  async createManyWithDetails(
    items: Array<{
      enquiryId: string;
      variantId: string;
      productId: string;
      sku: string;
      qty: number;
      createdBy?: string;
    }>,
  ): Promise<{ count: number }> {
    return this.getClient().enquiryItem.createMany({
      data: items.map((item) => ({
        enquiryId: item.enquiryId,
        variantId: item.variantId,
        productId: item.productId,
        sku: item.sku,
        qty: item.qty,
        createdBy: item.createdBy,
      })),
    });
  }

  async updatePrice(
    id: string,
    price: number,
    total: number,
    updatedBy?: string,
  ): Promise<EnquiryItemEntity> {
    return this.getClient().enquiryItem.update({
      where: { id },
      data: {
        price,
        total,
        updatedBy,
      },
    });
  }

  async batchUpdatePrices(
    updates: Array<{
      id: string;
      price: number;
      total: number;
    }>,
    updatedBy?: string,
  ): Promise<void> {
    await Promise.all(
      updates.map((update) =>
        this.getClient().enquiryItem.update({
          where: { id: update.id },
          data: {
            price: update.price,
            total: update.total,
            updatedBy,
          },
        }),
      ),
    );
  }
}
