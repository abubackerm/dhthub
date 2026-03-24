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
    productId: string;
    sku: string;
    price: number | null;
    total: number | null;
    qty: number;
    createdAt: Date;
    updatedAt: Date;
    variant: ProductVariantEntity;
  }>;
}

export interface EnquiryItemWithProduct {
  id: string;
  enquiryId: string;
  variantId: string;
  productId: string;
  sku: string;
  price: number | null;
  total: number | null;
  qty: number;
  createdAt: Date;
  updatedAt: Date;
  variant: ProductVariantEntity;
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
      _createdBy?: string;
    },
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.create({
      data: {
        userId: data.userId,
        status: data.status ?? EnquiryStatus.SUBMITTED,
        notes: data.notes ?? null,
      },
    });
  }

  async updateStatus(
    id: string,
    status: EnquiryStatus,
    _updatedBy?: string,
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.update({
      where: { id },
      data: {
        status,
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

  async generateEnquiryNumber(): Promise<string> {
    const count = await this.getClient().enquiry.count();
    const paddedNumber = (count + 1).toString().padStart(6, '0');
    return `ENQ-${paddedNumber}`;
  }

  async createWithCustomer(
    data: {
      userId: string;
      enquiryNumber: string;
      customerName: string;
      companyName?: string | null;
      email: string;
      phone?: string | null;
      status?: EnquiryStatus;
      notes?: string | null;
      _createdBy?: string;
    },
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.create({
      data: {
        userId: data.userId,
        enquiryNumber: data.enquiryNumber,
        customerName: data.customerName,
        companyName: data.companyName ?? null,
        email: data.email,
        phone: data.phone ?? null,
        status: data.status ?? EnquiryStatus.SUBMITTED,
        notes: data.notes ?? null,
      },
    });
  }

  async findAllWithFilters(
    filters?: {
      status?: EnquiryStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ enquiries: EnquiryEntity[]; total: number }> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { enquiryNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const [enquiries, total] = await Promise.all([
      this.getClient().enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.getClient().enquiry.count({ where }),
    ]);

    return { enquiries, total };
  }

  async updateQuote(
    id: string,
    _updatedBy?: string,
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.update({
      where: { id },
      data: {
        status: EnquiryStatus.QUOTED,
      },
    });
  }

  async markAsPaid(
    id: string,
    _updatedBy?: string,
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.update({
      where: { id },
      data: {
        status: EnquiryStatus.PAID,
      },
    });
  }

  async confirmOrder(
    id: string,
    _updatedBy?: string,
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.update({
      where: { id },
      data: {
        status: EnquiryStatus.CONFIRMED,
      },
    });
  }

  async setGrandTotal(
    id: string,
    grandTotal: number,
    _updatedBy?: string,
  ): Promise<EnquiryEntity> {
    return this.getClient().enquiry.update({
      where: { id },
      data: {
        grandTotal,
      },
    });
  }
}
