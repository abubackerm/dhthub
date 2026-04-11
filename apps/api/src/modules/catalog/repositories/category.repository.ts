import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { CategoryEntity } from '../entities/category.entity';

export interface CategoryWithCells extends CategoryEntity {
  cells: any[];
}

@Injectable()
export class CategoryRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<CategoryEntity[]> {
    return this.getClient().category.findMany();
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.getClient().category.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    return this.getClient().category.findUnique({
      where: { slug },
    });
  }

  async findByPath(path: string): Promise<CategoryEntity | null> {
    return this.getClient().category.findUnique({
      where: { path },
    });
  }

  async findBySku(sku: string): Promise<CategoryEntity | null> {
    return this.getClient().category.findFirst({
      where: { sku },
    });
  }

  async findRootCategories(): Promise<CategoryEntity[]> {
    const client = this.getClient();
    return client.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }) as any;
  }

  async findAllWithProductCount(): Promise<any[]> {
    const client = this.getClient();
    const categories = await client.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Get all cells grouped by categoryId
    const categoryIds = categories.map(c => c.id);
    const cells = await client.cell.findMany({
      where: {
        categoryId: { in: categoryIds },
      },
      select: {
        categoryId: true,
        _count: {
          select: { products: true },
        },
      },
    });

    // Aggregate product and cell counts per category
    const countMap = new Map<string, { products: number; cells: number }>();
    cells.forEach((cell: any) => {
      const currentCounts = countMap.get(cell.categoryId) || { products: 0, cells: 0 };
      countMap.set(cell.categoryId, {
        products: currentCounts.products + cell._count.products,
        cells: currentCounts.cells + 1,
      });
    });

    // Add product and cell counts to each category
    return categories.map(category => ({
      ...category,
      _count: {
        products: countMap.get(category.id)?.products || 0,
        cells: countMap.get(category.id)?.cells || 0,
      },
    }));
  }

  async findChildren(parentId: string): Promise<CategoryEntity[]> {
    const client = this.getClient();
    return client.category.findMany({
      where: { parentId },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }) as any;
  }

  async findByParentPath(parentPath: string): Promise<CategoryEntity[]> {
    return this.getClient().category.findMany({
      where: {
        path: { startsWith: `${parentPath}.` },
      },
    });
  }

  async searchByQuery(
    query: string,
    limit: number,
    options?: { leafOnly?: boolean },
  ): Promise<CategoryEntity[]> {
    const client = this.getClient();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: normalizedQuery, mode: 'insensitive' } },
        { slug: { contains: normalizedQuery, mode: 'insensitive' } },
        { path: { contains: normalizedQuery.toLowerCase() } },
      ],
    };

    if (options?.leafOnly) {
      where.children = { none: {} };
    }

    return client.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string | null;
    parentId?: string | null;
    path: string;
    imageUrl?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    createdBy?: string;
    sku?: string | null;
  }): Promise<CategoryEntity> {
    return this.getClient().category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
        path: data.path,
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        sku: data.sku ?? null,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string | null;
      parentId: string | null;
      path: string;
      imageUrl: string | null;
      sortOrder: number;
      isActive: boolean;
      updatedBy: string;
    }>,
  ): Promise<CategoryEntity> {
    return this.getClient().category.update({
      where: { id },
      data,
    });
  }

  async updateImage(categoryId: string, imageUrl: string): Promise<CategoryEntity> {
    return this.getClient().category.update({
      where: { id: categoryId },
      data: { imageUrl },
    });
  }

  async delete(id: string): Promise<CategoryEntity> {
    return this.getClient().category.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().category.count({ where });
  }

  async findWithCells(categoryId: string): Promise<CategoryWithCells> {
    const client = this.getClient();
    const category = await client.category.findUnique({
      where: { id: categoryId },
      include: {
        cells: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            images: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category as CategoryEntity & { cells: any[] };
  }

  async findLeafPageData(categoryId: string): Promise<{
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      path: string;
      imageUrl: string | null;
    };
    cells: any[];
    filterableAttributes: any[];
  }> {
    const client = this.getClient();

    const category = await client.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        path: true,
        imageUrl: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const cells = await client.cell.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
        },
        products: {
          where: { status: 'active' },
          orderBy: { name: 'asc' },
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
            variants: {
              orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
              include: {
                variantImages: {
                  orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                  take: 1,
                },
                attributeValues: {
                  include: {
                    attribute: true,
                    option: true,
                  },
                },
              },
            },
            tableColumns: {
              orderBy: { position: 'asc' },
              include: {
                attribute: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    const filterableAttributes = await client.categoryAttribute.findMany({
      where: {
        categoryId,
        attribute: { isFilterable: true },
      },
      include: {
        attribute: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return {
      category,
      cells,
      filterableAttributes,
    };
  }

  async findConsolidatedLeafData(categoryId: string): Promise<{
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      path: string;
      imageUrl: string | null;
    };
    leafCategories: Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      cells: any[];
      filterableAttributes: any[];
    }>;
    filterableAttributes: any[];
  }> {
    const client = this.getClient();

    // Get the parent category
    const category = await client.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        path: true,
        imageUrl: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Find all leaf categories (categories with no children) under this category
    const leafCategories = await client.category.findMany({
      where: {
        path: { startsWith: `${category.path}.` },
        children: { none: {} },
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });

    // For each leaf category, get its cells and filterable attributes
    const leafCategoriesWithCells = await Promise.all(
      leafCategories.map(async (leafCat) => {
        const cells = await client.cell.findMany({
          where: {
            categoryId: leafCat.id,
            isActive: true,
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            },
            products: {
              where: { status: 'active' },
              orderBy: { name: 'asc' },
              include: {
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                  take: 1,
                },
                variants: {
                  orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
              include: {
                variantImages: {
                  orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                  take: 1,
                },
                    attributeValues: {
                      include: {
                        attribute: true,
                        option: true,
                      },
                    },
                  },
                },
                tableColumns: {
                  orderBy: { position: 'asc' },
                  include: {
                    attribute: true,
                    unit: true,
                  },
                },
              },
            },
          },
        });

        const filterableAttributes = await client.categoryAttribute.findMany({
          where: {
            categoryId: leafCat.id,
            attribute: { isFilterable: true },
          },
          include: {
            attribute: {
              include: {
                options: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        });

        return {
          id: leafCat.id,
          name: leafCat.name,
          slug: leafCat.slug,
          description: leafCat.description,
          cells,
          filterableAttributes,
        };
      })
    );

    // Get all unique filterable attributes across all leaf categories
    const allFilterableAttributes = await client.categoryAttribute.findMany({
      where: {
        categoryId: {
          in: leafCategories.map(lc => lc.id),
        },
        attribute: { isFilterable: true },
      },
      include: {
        attribute: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: {
        attribute: {
          sortOrder: 'asc',
        },
      },
    });

    // Deduplicate attributes by attribute ID
    const uniqueFilterableAttributes = allFilterableAttributes.reduce((acc: any[], attr: any) => {
      if (!acc.find((a: any) => a.attribute.id === attr.attribute.id)) {
        acc.push(attr);
      }
      return acc;
    }, [] as any[]);

    return {
      category,
      leafCategories: leafCategoriesWithCells,
      filterableAttributes: uniqueFilterableAttributes,
    };
  }

  async findAggregatedFilterData(categoryId: string): Promise<{
    filterableAttributes: any[];
    variants: any[];
  }> {
    const client = this.getClient();

    const category = await client.category.findUnique({
      where: { id: categoryId },
      select: { id: true, path: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const leafCategories = await client.category.findMany({
      where: {
        path: { startsWith: `${category.path}.` },
        children: { none: {} },
        isActive: true,
      },
      select: { id: true },
    });

    const leafCategoryIds = leafCategories.map((lc) => lc.id);

    const [filterableAttributes, variants] = await Promise.all([
      client.categoryAttribute.findMany({
        where: {
          categoryId: { in: leafCategoryIds },
          attribute: { isFilterable: true },
        },
        include: {
          attribute: {
            include: {
              options: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
        orderBy: { attribute: { sortOrder: 'asc' } },
      }),
      client.productVariant.findMany({
        where: {
          product: {
            status: 'active',
            cell: { categoryId: { in: leafCategoryIds } },
          },
        },
        select: {
          id: true,
          sku: true,
          price: true,
          quantity: true,
          attributeValues: {
            include: {
              attribute: true,
              option: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              cell: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
      }),
    ]);

    const uniqueFilterableAttributes = filterableAttributes.reduce(
      (acc: any[], attr: any) => {
        if (!acc.find((a: any) => a.attribute.id === attr.attribute.id)) {
          acc.push(attr);
        }
        return acc;
      },
      [] as any[],
    );

    return {
      filterableAttributes: uniqueFilterableAttributes,
      variants,
    };
  }

  async deleteCascade(id: string): Promise<void> {
    // Collect all descendant category IDs (the category itself + all children recursively)
    const allIds: string[] = [id];
    let offset = 0;
    while (offset < allIds.length) {
      const children = await this.db.category.findMany({
        where: { parentId: { in: allIds.slice(offset) } },
        select: { id: true },
      });
      for (const child of children) {
        allIds.push(child.id);
      }
      offset = allIds.length - children.length;
      if (children.length === 0) break;
    }

    // Delete all category images and category-attribute links for the entire subtree
    await this.db.$transaction(async (tx) => {
      await tx.categoryImage.deleteMany({
        where: { categoryId: { in: allIds } },
      });
      await tx.categoryAttribute.deleteMany({
        where: { categoryId: { in: allIds } },
      });

      // Delete categories in reverse order (leaves first) to avoid FK violations
      // on the self-referencing parent relation
      const reversedIds = [...allIds].reverse();
      for (const categoryId of reversedIds) {
        await tx.category.delete({ where: { id: categoryId } });
      }
    });
  }

  async getSkuMap(): Promise<Map<string, string>> {
    const categories = await this.getClient().category.findMany({
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
    for (const category of categories) {
      if (category.sku) {
        map.set(category.sku, category.id);
      }
    }

    return map;
  }

  async getSlugMap(): Promise<Map<string, string>> {
    const categories = await this.getClient().category.findMany({
      select: {
        id: true,
        slug: true,
      },
    });

    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.slug, category.id);
    }

    return map;
  }
}
