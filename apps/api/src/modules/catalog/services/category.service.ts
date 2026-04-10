import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { CATALOG_EVENTS } from '@shared/events';
import {
  CategoryNotFoundError,
  CategorySlugAlreadyExistsError,
  CategoryCircularReferenceError,
  CategoryHasChildrenError,
} from '@shared/domain/errors';
import { CategoryRepository, CategoryWithCells } from '../repositories/category.repository';
import { CategoryEntity } from '../entities/category.entity';
import { CategoryCreatedEvent, CategoryUpdatedEvent } from '../events';
import { StorageService } from '@modules/storage/storage.service';
import { randomBytes } from 'crypto';

@Injectable()
export class CategoryService extends BaseService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    eventEmitter: EventEmitter2,
    private readonly categoryRepo: CategoryRepository,
    @Optional() private readonly storageService?: StorageService,
  ) {
    super(eventEmitter);
  }

  private generateSKU(): string {
    const randomPart = randomBytes(4).toString('hex').toUpperCase();
    return `CG-${randomPart}`;
  }

  async create(
    name: string,
    slug: string,
    description?: string | null,
    parentId?: string | null,
    imageUrl?: string | null,
    sortOrder?: number,
    isActive?: boolean,
    createdBy?: string,
    sku?: string,
  ): Promise<CategoryEntity> {
    const existingSlug = await this.categoryRepo.findBySlug(slug);
    if (existingSlug) {
      throw new CategorySlugAlreadyExistsError(slug);
    }

    let path = slug;
    if (parentId) {
      const parent = await this.categoryRepo.findById(parentId);
      if (!parent) {
        throw new CategoryNotFoundError(parentId);
      }
      path = `${parent.path}.${slug}`;
    }

    const category = await this.categoryRepo.create({
      name,
      slug,
      description: description ?? null,
      parentId: parentId ?? null,
      path,
      imageUrl: imageUrl ?? null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
      createdBy,
      sku: sku ?? this.generateSKU(),
    });

    this.emit(
      CATALOG_EVENTS.CATEGORY_CREATED,
      new CategoryCreatedEvent(
        category.id,
        category.name,
        category.slug,
        category.parentId,
      ),
    );

    return category;
  }

  async findById(id: string): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new CategoryNotFoundError(id);
    }
    return category;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    return this.categoryRepo.findBySlug(slug);
  }

  async findByPath(path: string): Promise<CategoryEntity | null> {
    return this.categoryRepo.findByPath(path);
  }

  async findAll(): Promise<CategoryEntity[]> {
    return this.categoryRepo.findAll();
  }

  async findRootCategories(): Promise<CategoryEntity[]> {
    return this.categoryRepo.findRootCategories();
  }

  async findChildren(parentId: string): Promise<CategoryEntity[]> {
    return this.categoryRepo.findChildren(parentId);
  }

  async findSubtree(parentPath: string): Promise<CategoryEntity[]> {
    return this.categoryRepo.findByParentPath(parentPath);
  }

  async findWithCells(categoryId: string): Promise<CategoryWithCells> {
    return this.categoryRepo.findWithCells(categoryId);
  }

  async getLeafPageData(slug: string): Promise<{
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
  } | null> {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category || !category.isActive) {
      return null;
    }
    return this.categoryRepo.findLeafPageData(category.id);
  }

  async getConsolidatedLeafData(slug: string): Promise<{
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
  } | null> {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category || !category.isActive) {
      return null;
    }
    return this.categoryRepo.findConsolidatedLeafData(category.id);
  }

  async getAggregatedFilterData(slug: string): Promise<{
    filterableAttributes: any[];
    variants: any[];
  } | null> {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category || !category.isActive) {
      return null;
    }
    return this.categoryRepo.findAggregatedFilterData(category.id);
  }

  async search(
    query: string,
    limit: number = 20,
    options?: { leafOnly?: boolean },
  ): Promise<CategoryEntity[]> {
    return this.categoryRepo.searchByQuery(query, limit, options);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string | null;
      imageUrl: string | null;
      sortOrder: number;
      isActive: boolean;
      updatedBy: string;
      sku: string;
    }>,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    if (data.slug && data.slug !== category.slug) {
      const existingSlug = await this.categoryRepo.findBySlug(data.slug);
      if (existingSlug) {
        throw new CategorySlugAlreadyExistsError(data.slug);
      }
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data)) {
      const typedKey = key as keyof typeof data;
      if (data[typedKey] !== undefined) {
        changes[key] = {
          from: category[typedKey as keyof CategoryEntity],
          to: data[typedKey],
        };
      }
    }

    // Clean up old image from SeaweedFS if imageUrl is being changed or set to null
    if (data.imageUrl !== undefined && category.imageUrl && data.imageUrl !== category.imageUrl) {
      await this.deleteStorageFile(category.imageUrl);
    }

    const updatedCategory = await this.categoryRepo.update(id, data);

    this.emit(
      CATALOG_EVENTS.CATEGORY_UPDATED,
      new CategoryUpdatedEvent(category.id, changes),
    );

    return updatedCategory;
  }

  async move(id: string, newParentId: string | null): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    if (newParentId) {
      const newParent = await this.categoryRepo.findById(newParentId);
      if (!newParent) {
        throw new CategoryNotFoundError(newParentId);
      }

      if (newParent.path.startsWith(category.path)) {
        throw new CategoryCircularReferenceError(id, newParentId);
      }
    }

    let newPath: string;
    if (newParentId) {
      const newParent = await this.categoryRepo.findById(newParentId);
      newPath = `${newParent!.path}.${category.slug}`;
    } else {
      newPath = category.slug;
    }

    const updatedCategory = await this.categoryRepo.update(id, {
      parentId: newParentId,
      path: newPath,
    });

    const descendants = await this.categoryRepo.findByParentPath(category.path);
    for (const descendant of descendants) {
      const descendantNewPath = descendant.path.replace(category.path, newPath);
      await this.categoryRepo.update(descendant.id, { path: descendantNewPath });
    }

    const changes = {
      parentId: { from: category.parentId, to: newParentId },
      path: { from: category.path, to: newPath },
    };

    this.emit(
      CATALOG_EVENTS.CATEGORY_UPDATED,
      new CategoryUpdatedEvent(category.id, changes),
    );

    return updatedCategory;
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    const children = await this.categoryRepo.findChildren(id);
    if (children.length > 0) {
      throw new CategoryHasChildrenError(category.name, children.length);
    }

    await this.categoryRepo.delete(id);
  }

  async getTree(): Promise<CategoryEntity[]> {
    // Fetch all categories with product counts in a single query
    const allCategories = await this.categoryRepo.findAllWithProductCount();
    
    // Build the tree in memory
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

    // First pass: create map of all categories
    for (const category of allCategories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    // Second pass: build tree structure
    for (const category of allCategories) {
      const node = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootCategories.push(node);
      }
    }

    return rootCategories;
  }

  private async deleteStorageFile(imageUrl: string): Promise<void> {
    if (!this.storageService || !imageUrl) return;
    const storageKey = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    try {
      await this.storageService.deleteFile(storageKey);
    } catch (error) {
      this.logger.warn(`Failed to delete old file from SeaweedFS: ${storageKey}`, error);
    }
  }
}
