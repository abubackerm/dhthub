import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { CategoryEntity } from '../entities/category.entity';
import { CategoryTooManyLeafCategoriesError } from '@shared/domain/errors';
import { Prisma } from '@prisma/client';
import pLimit from 'p-limit';

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

  async findBySlugWithAncestors(slug: string): Promise<{
    category: CategoryEntity & { _count: { children: number } };
    ancestors: CategoryEntity[];
  } | null> {
    const client = this.getClient();
    const category = await client.category.findUnique({
      where: { slug },
      include: {
        _count: { select: { children: true } },
      },
    });

    if (!category) return null;

    const ancestors: CategoryEntity[] = [];
    if (category.path) {
      const pathSegments = category.path.split('.');
      pathSegments.pop(); // remove the category itself
      for (const segment of pathSegments) {
        const ancestor = await client.category.findUnique({
          where: { path: segment },
        });
        if (ancestor) ancestors.push(ancestor);
      }
    }

    return { category: category as CategoryEntity & { _count: { children: number } }, ancestors };
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

  /**
   * Maximum number of leaf categories processed in a single consolidated request.
   * Beyond this limit a `CategoryTooManyLeafCategoriesError` (HTTP 413) is thrown
   * so the frontend can guide the user to a narrower category.
   */
  static readonly MAX_CONSOLIDATED_LEAVES = 50;

  /**
   * Batch size for chunked cell queries. Postgres handles IN clauses well
   * up to a few hundred values; 20 keeps each query fast and predictable.
   */
  private static readonly CELL_BATCH_SIZE = 20;

  /**
   * Concurrency limit for parallel cell-fetch chunks.
   */
  private static readonly CELL_QUERY_CONCURRENCY = 3;

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
    totalLeafCount: number;
    isTruncated: boolean;
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

    const totalLeafCount = leafCategories.length;

    // Reject requests for categories with too many leaf descendants.
    // The frontend should guide users to a narrower sub-category.
    if (totalLeafCount > CategoryRepository.MAX_CONSOLIDATED_LEAVES) {
      throw new CategoryTooManyLeafCategoriesError(
        totalLeafCount,
        CategoryRepository.MAX_CONSOLIDATED_LEAVES,
        category.name,
      );
    }

    const activeLeafIds = leafCategories.map(lc => lc.id);

    // --- Batch 1: Fetch all cells for active leaf categories in concurrent chunks ---
    const cellInclude = {
      images: {
        orderBy: [{ isPrimary: 'desc' as const }, { position: 'asc' as const }],
      },
      products: {
        where: { status: 'active' },
        orderBy: { name: 'asc' as const },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
            take: 1,
          },
          variants: {
            orderBy: [{ isDefault: 'desc' as const }, { sortOrder: 'asc' as const }],
            include: {
              variantImages: {
                orderBy: [{ isPrimary: 'desc' as const }, { position: 'asc' as const }],
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
            orderBy: { position: 'asc' as const },
            include: {
              attribute: true,
              unit: true,
            },
          },
        },
      },
    } as const;

    // Chunk leaf IDs and fetch cells concurrently with bounded parallelism
    const chunks: string[][] = [];
    for (let i = 0; i < activeLeafIds.length; i += CategoryRepository.CELL_BATCH_SIZE) {
      chunks.push(activeLeafIds.slice(i, i + CategoryRepository.CELL_BATCH_SIZE));
    }

    const limit = pLimit(CategoryRepository.CELL_QUERY_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunks.map(chunk =>
        limit(() =>
          client.cell.findMany({
            where: {
              categoryId: { in: chunk },
              isActive: true,
            },
            orderBy: { sortOrder: 'asc' },
            include: cellInclude,
          }),
        ),
      ),
    );

    const allCells = chunkResults.flat();

    // Group cells by categoryId
    const cellsByCategory = new Map<string, any[]>();
    for (const cell of allCells) {
      const catId = (cell as any).categoryId;
      if (!catId) continue;
      const existing = cellsByCategory.get(catId) || [];
      existing.push(cell);
      cellsByCategory.set(catId, existing);
    }

    // --- Batch 2: Fetch all filterable attributes across all active leaves in one query ---
    const allFilterableAttributes = await client.categoryAttribute.findMany({
      where: {
        categoryId: { in: activeLeafIds },
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

    // Group filterable attributes by categoryId
    const attrsByCategory = new Map<string, any[]>();
    for (const attr of allFilterableAttributes) {
      const catId = (attr as any).categoryId;
      if (!catId) continue;
      const existing = attrsByCategory.get(catId) || [];
      existing.push(attr);
      attrsByCategory.set(catId, existing);
    }

    // Deduplicate attributes by attribute ID (for the top-level list)
    const uniqueFilterableAttributes = allFilterableAttributes.reduce((acc: any[], attr: any) => {
      if (!acc.find((a: any) => a.attribute.id === attr.attribute.id)) {
        acc.push(attr);
      }
      return acc;
    }, [] as any[]);

    // Assemble leaf categories with their batched data
    const leafCategoriesWithCells = leafCategories.map((leafCat) => ({
      id: leafCat.id,
      name: leafCat.name,
      slug: leafCat.slug,
      description: leafCat.description,
      cells: cellsByCategory.get(leafCat.id) || [],
      filterableAttributes: attrsByCategory.get(leafCat.id) || [],
    }));

    return {
      category,
      leafCategories: leafCategoriesWithCells,
      filterableAttributes: uniqueFilterableAttributes,
      totalLeafCount,
      isTruncated: false,
    };
  }

  async findAggregatedFilterData(categoryId: string): Promise<{
    filterableAttributes: any[];
    facets: Array<{
      attributeId: string;
      optionId?: string;
      optionLabel?: string;
      optionValue?: string;
      variantCount: number;
      min?: number | null;
      max?: number | null;
    }>;
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

    const filterableAttributes = await client.categoryAttribute.findMany({
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
    });

    const uniqueFilterableAttributes = filterableAttributes.reduce(
      (acc: any[], attr: any) => {
        if (!acc.find((a: any) => a.attribute.id === attr.attribute.id)) {
          acc.push(attr);
        }
        return acc;
      },
      [] as any[],
    );

    const filterableAttributeIds = uniqueFilterableAttributes.map((a: any) => a.attribute.id);

    if (filterableAttributeIds.length === 0) {
      return { filterableAttributes: uniqueFilterableAttributes, facets: [] };
    }

    // Option/enum facet counts: COUNT(DISTINCT variant_id) per attribute+option
    const optionFacets = await this.db.$queryRaw<Array<{
      attributeId: string;
      optionId: string;
      optionLabel: string;
      optionValue: string;
      variantCount: number;
    }>>(Prisma.sql`
      SELECT
        av.attribute_id as "attributeId",
        ao.id as "optionId",
        ao.label as "optionLabel",
        ao.value as "optionValue",
        COUNT(DISTINCT pv.id)::int as "variantCount"
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN cells c ON c.id = p.cell_id AND c.is_active = true
      JOIN variant_attribute_values av ON av.variant_id = pv.id
      JOIN attribute_options ao ON ao.id = av.option_id
      WHERE p.status = 'active'
        AND c.category_id = ANY(${leafCategoryIds}::text[])
        AND av.attribute_id = ANY(${filterableAttributeIds}::text[])
      GROUP BY av.attribute_id, ao.id, ao.label, ao.value
      LIMIT 50
    `);

    // Number range facets: MIN/MAX per attribute
    const numberFacets = await this.db.$queryRaw<Array<{
      attributeId: string;
      min: number | null;
      max: number | null;
    }>>(Prisma.sql`
      SELECT
        av.attribute_id as "attributeId",
        MIN(av.number_value) as min,
        MAX(av.number_value) as max
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN cells c ON c.id = p.cell_id AND c.is_active = true
      JOIN variant_attribute_values av ON av.variant_id = pv.id
      WHERE p.status = 'active'
        AND c.category_id = ANY(${leafCategoryIds}::text[])
        AND av.attribute_id = ANY(${filterableAttributeIds}::text[])
        AND av.number_value IS NOT NULL
      GROUP BY av.attribute_id
    `);

    // Boolean facet counts: true/false per boolean attribute
    const booleanFacets = await this.db.$queryRaw<Array<{
      attributeId: string;
      optionId: string;
      optionLabel: string;
      optionValue: string;
      variantCount: number;
    }>>(Prisma.sql`
      SELECT
        av.attribute_id as "attributeId",
        av.boolean_value::text as "optionId",
        CASE WHEN av.boolean_value = true THEN 'Yes' ELSE 'No' END as "optionLabel",
        av.boolean_value::text as "optionValue",
        COUNT(DISTINCT pv.id)::int as "variantCount"
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN cells c ON c.id = p.cell_id AND c.is_active = true
      JOIN variant_attribute_values av ON av.variant_id = pv.id
      JOIN attribute_definitions a ON a.id = av.attribute_id AND a.data_type = 'boolean'
      WHERE p.status = 'active'
        AND c.category_id = ANY(${leafCategoryIds}::text[])
        AND av.attribute_id = ANY(${filterableAttributeIds}::text[])
        AND av.boolean_value IS NOT NULL
      GROUP BY av.attribute_id, av.boolean_value
    `);

    const facets: Array<{
      attributeId: string;
      optionId?: string;
      optionLabel?: string;
      optionValue?: string;
      variantCount: number;
      min?: number | null;
      max?: number | null;
    }> = [];

    for (const row of optionFacets) {
      facets.push({
        attributeId: row.attributeId,
        optionId: row.optionId,
        optionLabel: row.optionLabel,
        optionValue: row.optionValue,
        variantCount: row.variantCount,
      });
    }

    for (const row of numberFacets) {
      facets.push({
        attributeId: row.attributeId,
        variantCount: 0,
        min: row.min,
        max: row.max,
      });
    }

    for (const row of booleanFacets) {
      facets.push({
        attributeId: row.attributeId,
        optionId: row.optionId,
        optionLabel: row.optionLabel,
        optionValue: row.optionValue,
        variantCount: row.variantCount,
      });
    }

    return {
      filterableAttributes: uniqueFilterableAttributes,
      facets,
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
