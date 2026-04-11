import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from '../../../core/database/database.provider';
import { Prisma } from '@prisma/client';

@Injectable()
export class CellRepository {
  constructor(private readonly db: DatabaseProvider) {}

  async findById(id: string) {
    return this.db.cell.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.db.cell.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });
  }

  async findByCategoryId(
    categoryId: string,
    activeOnly: boolean = false
  ) {
    return this.db.cell.findMany({
      where: {
        categoryId,
        ...(activeOnly && { isActive: true }),
      },
      include: {
        category: true,
        images: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async findLeafCategoryById(id: string) {
    const category = await this.db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category is a leaf (has no children)
    const isLeaf = category._count.children === 0;

    return {
      ...category,
      isLeaf,
    };
  }

  async create(data: Prisma.CellCreateInput) {
    return this.db.cell.create({
      data,
      include: {
        category: true,
      },
    });
  }

  async update(id: string, data: Prisma.CellUpdateInput) {
    return this.db.cell.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async delete(id: string) {
    return this.db.cell.delete({
      where: { id },
    });
  }

  async countProducts(id: string) {
    const result = await this.db.product.aggregate({
      where: {
        cellId: id,
      },
      _count: true,
    });

    return result._count;
  }

  async addAttribute(cellId: string, attributeId: string, displayOrder: number = 0) {
    return this.db.cellAttribute.create({
      data: {
        cellId,
        attributeId,
        displayOrder,
      },
      include: {
        attribute: true,
      },
    });
  }

  async removeAttribute(cellId: string, attributeId: string) {
    return this.db.cellAttribute.deleteMany({
      where: {
        cellId,
        attributeId,
      },
    });
  }

  async getAttributes(cellId: string) {
    return this.db.cellAttribute.findMany({
      where: {
        cellId,
      },
      include: {
        attribute: {
          include: {
            options: true,
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async list(params: {
    skip?: number;
    take?: number;
    categoryId?: string;
    activeOnly?: boolean;
  }) {
    const { skip, take, categoryId, activeOnly } = params;

    const where: Prisma.CellWhereInput = {
      ...(categoryId && { categoryId }),
      ...(activeOnly && { isActive: true }),
    };

    const [cells, total] = await Promise.all([
      this.db.cell.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          images: {
            orderBy: { position: 'asc' },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
      this.db.cell.count({ where }),
    ]);

    return { cells, total };
  }

  async getSlugMap(): Promise<Map<string, string>> {
    const cells = await this.db.cell.findMany({
      select: {
        id: true,
        slug: true,
      },
    });

    const map = new Map<string, string>();
    for (const cell of cells) {
      map.set(cell.slug, cell.id);
    }

    return map;
  }

  async findBySku(sku: string) {
    return this.db.cell.findUnique({
      where: { sku },
      include: {
        category: true,
      },
    });
  }

  async getSkuMap(): Promise<Map<string, string>> {
    const cells = await this.db.cell.findMany({
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
    for (const cell of cells) {
      if (cell.sku) {
        map.set(cell.sku, cell.id);
      }
    }

    return map;
  }

  async findByIds(ids: string[]): Promise<Array<{ id: string; slug: string; sku: string | null }>> {
    if (ids.length === 0) return [];
    return this.db.cell.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        sku: true,
      },
    });
  }
}
