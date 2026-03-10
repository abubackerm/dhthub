import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { BaseService } from '@shared/domain';
import { CategoryAttributeRepository } from '../repositories';
import { AttributeDefinitionRepository } from '../repositories/attribute-definition.repository';
import { CategoryRepository } from '@modules/catalog/repositories/category.repository';
import { CategoryAttributeEntity } from '../entities';
import { CacheService } from '@core/cache';

export interface AssignCategoryAttributeData {
  categoryId: string;
  attributeId: string;
}

@Injectable()
export class CategoryAttributeService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly categoryAttributeRepo: CategoryAttributeRepository,
    private readonly attributeRepo: AttributeDefinitionRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    super(eventEmitter);
  }

  private get ttl(): number {
    return this.configService.get('cache.ttl.categoryAttribute') ?? 1800;
  }

  private getCacheKey(categoryId: string): string {
    return `category-attributes:${categoryId}`;
  }

  private getCacheKeyById(id: string): string {
    return `category-attribute:${id}`;
  }

  async assignAttribute(
    data: AssignCategoryAttributeData,
  ): Promise<CategoryAttributeEntity> {
    const category = await this.categoryRepo.findById(data.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const attribute = await this.attributeRepo.findById(data.attributeId);
    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }

    const existing = await this.categoryAttributeRepo.findByCategoryId(data.categoryId);
    const duplicate = existing.find((ca) => ca.attributeId === data.attributeId);
    if (duplicate) {
      throw new ConflictException('Attribute is already assigned to this category');
    }

    const categoryAttribute = await this.categoryAttributeRepo.create(data);

    await this.cacheService.del(this.getCacheKey(data.categoryId));

    this.emit('category.attribute.assigned', {
      id: categoryAttribute.id,
      categoryId: categoryAttribute.categoryId,
      attributeId: categoryAttribute.attributeId,
    });

    return categoryAttribute;
  }

  async getCategoryAttributes(categoryId: string): Promise<CategoryAttributeEntity[]> {
    return this.cacheService.wrap(
      this.getCacheKey(categoryId),
      async () => {
        const category = await this.categoryRepo.findById(categoryId);
        if (!category) {
          throw new NotFoundException('Category not found');
        }

        return this.categoryAttributeRepo.findByCategoryId(categoryId);
      },
      this.ttl,
    );
  }

  async removeAttribute(id: string): Promise<void> {
    const existing = await this.categoryAttributeRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Category attribute not found');
    }

    await this.categoryAttributeRepo.delete(id);

    await this.cacheService.del(this.getCacheKey(existing.categoryId));
    await this.cacheService.del(this.getCacheKeyById(id));

    this.emit('category.attribute.removed', {
      id,
      categoryId: existing.categoryId,
      attributeId: existing.attributeId,
    });
  }

  async removeByCategory(categoryId: string): Promise<void> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.categoryAttributeRepo.deleteByCategoryId(categoryId);

    await this.cacheService.del(this.getCacheKey(categoryId));

    this.emit('category.attributes.removed', { categoryId });
  }
}
