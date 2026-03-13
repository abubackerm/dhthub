import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { EnquiryEntity, EnquiryStatus } from '../entities';
import { ProductVariantEntity } from '../../catalog/entities/product-variant.entity';

export interface EnquiryWithItems extends EnquiryEntity {
  items: Array<{
    id: string;
    enquiryId: string;
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
export class EnquiryRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<EnquiryEntity | null> {
    return this.getClient().enquiry.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<EnquiryEntity[]> {
    return this.getClient().enquiry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdWithItems(id: string): Promise<EnquiryWithItems | null> {
    return this.getClient().enquiry.findUnique({
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
    }) as unknown as EnquiryWithItems | null;
  }

  async findByUserIdWithItems(userId: string): Promise<EnquiryWithItems[]> {
    return this.getClient().enquiry.findMany({
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
      orderBy: { createdAt: 'desc' },
    }) as unknown as EnquiryWithItems[];
  }

  async create(
    data: {
      userId: string;
      status?: EnquiryStatus;
      notes?: string | null;
      createdBy?: string;
    },
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.create({
      data: {
        userId: data.userId,
        status: data.status ?? EnquiryStatus.SUBMITTED,
        notes: data.notes ?? null,
        createdBy: data.createdBy,
      },
    });
  }

  async updateStatus(
    id: string,
    status: EnquiryStatus,
    updatedBy?: string,
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.update({
      where: { id },
      data: {
        status,
        updatedBy,
      },
    });
  }

  async findByStatus(status: EnquiryStatus): Promise<EnquiryEntity[]> {
    return this.getClient().enquiry.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStatusWithItems(
    status: EnquiryStatus,
  ): Promise<EnquiryWithItems[]> {
    return this.getClient().enquiry.findMany({
      where: { status },
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
      orderBy: { createdAt: 'desc' },
    }) as unknown as EnquiryWithItems[];
  }

  async delete(id: string): Promise<EnquiryEntity> {
    return this.getClient().enquiry.delete({
      where: { id },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.getClient().enquiry.count({
      where: { userId },
    });
  }
}
