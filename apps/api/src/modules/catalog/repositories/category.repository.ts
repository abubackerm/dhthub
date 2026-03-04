import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { CategoryEntity } from '../entities/category.entity';

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

  async findRootCategories(): Promise<CategoryEntity[]> {
    const client = this.getClient();
    return client.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    }) as any;
  }

  async findAllWithProductCount(): Promise<CategoryEntity[]> {
    const client = this.getClient();
    return client.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }) as any;
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
        _count: {
          select: { products: true },
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

  async delete(id: string): Promise<CategoryEntity> {
    return this.getClient().category.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().category.count({ where });
  }
}
