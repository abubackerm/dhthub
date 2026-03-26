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

  async findMany(options?: {
    where?: any;
    include?: any;
  }): Promise<ProductEntity[]> {
    return this.getClient().product.findMany(options);
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.getClient().product.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[]): Promise<ProductEntity[]> {
    if (ids.length === 0) return [];
    return this.getClient().product.findMany({
      where: { id: { in: ids } },
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

  async findBySlugWithDetails(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    status: string;
    price: number | null;
    compareAtPrice: number | null;
    currency: string;
    quantity: number;
    isFeatured: boolean;
    cell: {
      id: string;
      name: string;
      slug: string;
      category: {
        id: string;
        name: string;
        slug: string;
        path: string;
      };
    } | null;
    variants: {
      id: string;
      sku: string;
      name: string;
      price: number | null;
      compareAtPrice: number | null;
      quantity: number;
      isDefault: boolean;
      sortOrder: number;
      images: { url: string; altText: string | null; isPrimary: boolean }[];
      attributeValues: {
        id: string;
        numberValue: number | null;
        textValue: string | null;
        booleanValue: boolean | null;
        attribute: {
          id: string;
          name: string;
          slug: string;
          dataType: string;
          unit: { symbol: string } | null;
        };
        option: { id: string; label: string; value: string } | null;
      }[];
    }[];
    images: { url: string; altText: string | null; isPrimary: boolean }[];
  } | null> {
    const client = this.getClient();
    const product = await client.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        status: true,
        price: true,
        compareAtPrice: true,
        currency: true,
        quantity: true,
        isFeatured: true,
        cell: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                path: true,
              },
            },
          },
        },
        variants: {
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            compareAtPrice: true,
            quantity: true,
            isDefault: true,
            sortOrder: true,
            variantImages: {
              select: {
                storagePath: true,
                altText: true,
                isPrimary: true,
              },
            },
            attributeValues: {
              select: {
                id: true,
                numberValue: true,
                textValue: true,
                booleanValue: true,
                attribute: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    dataType: true,
                    unit: {
                      select: { symbol: true },
                    },
                  },
                },
                option: {
                  select: { id: true, label: true, value: true },
                },
              },
            },
          },
        },
        images: {
          where: { variantId: null },
          select: {
            url: true,
            altText: true,
            isPrimary: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) return null;

    // Transform variantImages to images format with relative URLs for proxy
    return {
      ...product,
      variants: product.variants.map((variant: any) => ({
        ...variant,
        images: (variant.variantImages || []).map((img: any) => ({
          url: img.storagePath,
          altText: img.altText,
          isPrimary: img.isPrimary,
        })),
      })),
    };
  }

  async findByCategoryId(categoryId: string): Promise<ProductEntity[]> {
    const cells = await this.getClient().cell.findMany({
      where: { categoryId },
      select: { id: true },
    });

    if (cells.length === 0) return [];

    const cellIds = cells.map((cell) => cell.id);
    return this.getClient().product.findMany({
      where: { cellId: { in: cellIds } },
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
    cellId?: string | null;
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
        cellId: data.cellId ?? null,
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
      cellId: string | null;
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

  async updateMany(
    ids: string[],
    data: Partial<{
      status: string;
      price: number | null;
      quantity: number;
      cellId: string | null;
      isFeatured: boolean;
    }>,
  ): Promise<number> {
    const result = await this.getClient().product.updateMany({
      where: { id: { in: ids } },
      data: {
        ...data,
      },
    });
    return result.count;
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
    cellId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ products: ProductEntity[]; total: number }> {
    console.log('[ProductRepository] findAllWithSearch called with options:', JSON.stringify(options, null, 2))

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
      // Find all cells under this category
      const cells = await this.getClient().cell.findMany({
        where: { categoryId: options.categoryId },
        select: { id: true },
      });

      if (cells.length === 0) {
        return { products: [], total: 0 };
      }

      where.cellId = { in: cells.map((cell) => cell.id) };
    }

    if (options.cellId) {
      where.cellId = options.cellId;
    }

    if (options.status) {
      where.status = options.status;
    }

    console.log('[ProductRepository] Final where clause:', JSON.stringify(where, null, 2))

    const [products, total] = await Promise.all([
      this.getClient().product.findMany({
        where,
        include: {
          variants: {
            include: {
              variantImages: true,
            },
          },
          images: {
            where: { variantId: null },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
        },
        take: options.limit,
        skip: options.offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.getClient().product.count({ where }),
    ]);

    console.log('[ProductRepository] Found products:', products.length, 'total:', total)

    return { products, total };
  }

  async getSlugMap(): Promise<Map<string, string>> {
    const products = await this.getClient().product.findMany({
      select: {
        id: true,
        slug: true,
      },
    });

    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.slug, product.id);
    }

    return map;
  }

  async getSkuMap(): Promise<Map<string, string>> {
    const products = await this.getClient().product.findMany({
      where: {
        sku: {
          not: null,
        },
      },
      select: {
        id: true,
        sku: true,
      },
    });

    const map = new Map<string, string>();
    for (const product of products) {
      if (product.sku) {
        map.set(product.sku, product.id);
      }
    }

    return map;
  }
}
