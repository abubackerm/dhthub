import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { ProductEntity } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<ProductEntity[]> {
    return this.getClient().product.findMany();
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.getClient().product.findUnique({
      where: { id },
    });
  }

  async findBySku(sku: string): Promise<ProductEntity | null> {
    const variant = await this.getClient().productVariant.findUnique({
      where: { sku },
      include: { product: true },
    });
    return variant?.product ?? null;
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    return this.getClient().product.findUnique({
      where: { slug },
    });
  }

  async findByCategoryId(categoryId: string): Promise<ProductEntity[]> {
    return this.getClient().product.findMany({
      where: { categoryId },
    });
  }

  async findActive(): Promise<ProductEntity[]> {
    return this.getClient().product.findMany({
      where: { status: 'active' },
    });
  }

  async create(data: {
    sku: string | null;
    name: string;
    slug: string;
    description?: string | null;
    type?: string;
    status?: string;
    price?: number | null;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    currency?: string;
    quantity?: number;
    categoryId?: string | null;
    isFeatured?: boolean;
    metadata?: Record<string, unknown> | null;
    createdBy?: string;
  }): Promise<ProductEntity> {
    return this.getClient().product.create({
      data: {
        sku: data.sku,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        type: data.type ?? 'simple',
        status: data.status ?? 'draft',
        price: data.price ?? null,
        compareAtPrice: data.compareAtPrice ?? null,
        costPrice: data.costPrice ?? null,
        currency: data.currency ?? 'USD',
        quantity: data.quantity ?? 0,
        categoryId: data.categoryId ?? null,
        isFeatured: data.isFeatured ?? false,
        metadata: data.metadata ?? null,
        createdBy: data.createdBy,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      sku: string | null;
      name: string;
      slug: string;
      description: string | null;
      type: string;
      status: string;
      price: number | null;
      compareAtPrice: number | null;
      costPrice: number | null;
      currency: string;
      quantity: number;
      categoryId: string | null;
      isFeatured: boolean;
      metadata: Record<string, unknown> | null;
      updatedBy: string;
    }>,
  ): Promise<ProductEntity> {
    return this.getClient().product.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  async delete(id: string): Promise<ProductEntity> {
    return this.getClient().product.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().product.count({ where });
  }

  async countAll(): Promise<number> {
    return this.getClient().product.count();
  }

  async findAllWithSearch(options: {
    search?: string;
    categoryId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ products: ProductEntity[]; total: number }> {
    const where: any = {};

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        {
          variants: {
            some: {
              sku: { contains: options.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options.status) {
      where.status = options.status;
    }

    const [products, total] = await Promise.all([
      this.getClient().product.findMany({
        where,
        take: options.limit,
        skip: options.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.getClient().product.count({ where }),
    ]);

    return { products, total };
  }
}
