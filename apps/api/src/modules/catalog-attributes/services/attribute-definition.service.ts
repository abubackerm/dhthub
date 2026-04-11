import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { BaseService } from '@shared/domain';
import { AttributeDefinitionRepository, AttributeUnitRepository, UnitDefinitionRepository } from '../repositories';
import { AttributeDefinitionEntity, AttributeDataType, AttributeFilterType } from '../entities';
import { CacheService } from '@core/cache';

export interface CreateAttributeDefinitionData {
  name: string;
  slug?: string;
  dataType: AttributeDataType;
  group?: string | null;
  sortOrder?: number;
  filterType?: AttributeFilterType | null;
  unitIds?: string[];
  isFilterable?: boolean;
  isRequired?: boolean;
  createdBy?: string;
}

export interface UpdateAttributeDefinitionData {
  name?: string;
  slug?: string;
  dataType?: AttributeDataType;
  group?: string | null;
  sortOrder?: number;
  filterType?: AttributeFilterType | null;
  unitIds?: string[];
  isFilterable?: boolean;
  isRequired?: boolean;
  updatedBy?: string;
}

@Injectable()
export class AttributeDefinitionService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly attributeRepo: AttributeDefinitionRepository,
    private readonly attributeUnitRepo: AttributeUnitRepository,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    super(eventEmitter);
  }

  private get ttl(): number {
    return this.configService.get('cache.ttl.attributeDefinition') ?? 3600;
  }

  private getCacheKey(id: string): string {
    return `attribute:${id}`;
  }

  private getCacheKeyBySlug(slug: string): string {
    return `attribute:slug:${slug}`;
  }

  /**
   * Generate a slug from a name
   */
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'attribute';
  }

  /**
   * Generate a unique slug, adding a suffix if needed
   */
  private async generateUniqueSlug(baseName: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlugFromName(baseName);
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.attributeRepo.findBySlug(slug);
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  }

  /**
   * Sync attribute-unit join rows: delete existing and create new ones
   */
  private async syncAttributeUnits(attributeId: string, unitIds: string[]): Promise<void> {
    await this.attributeUnitRepo.deleteByAttributeId(attributeId);
    if (unitIds.length > 0) {
      await this.attributeUnitRepo.createMany(
        unitIds.map((unitId) => ({ attributeId, unitId })),
      );
    }
  }

  async create(data: CreateAttributeDefinitionData): Promise<AttributeDefinitionEntity> {
    // Auto-generate slug if not provided
    const slug = data.slug || await this.generateUniqueSlug(data.name);

    const existing = await this.attributeRepo.findBySlug(slug);
    if (existing) {
      // If slug exists, generate a unique one
      const uniqueSlug = await this.generateUniqueSlug(data.name);
      const attribute = await this.attributeRepo.create({
        ...data,
        slug: uniqueSlug,
      });

      // Sync units
      if (data.unitIds && data.unitIds.length > 0) {
        await this.syncAttributeUnits(attribute.id, data.unitIds);
      }

      this.emit('attribute.created', {
        id: attribute.id,
        name: attribute.name,
        slug: attribute.slug,
      });

      return this.attributeRepo.findById(attribute.id) as Promise<AttributeDefinitionEntity>;
    }

    const attribute = await this.attributeRepo.create({
      ...data,
      slug,
    });

    // Sync units
    if (data.unitIds && data.unitIds.length > 0) {
      await this.syncAttributeUnits(attribute.id, data.unitIds);
    }

    this.emit('attribute.created', {
      id: attribute.id,
      name: attribute.name,
      slug: attribute.slug,
    });

    return this.attributeRepo.findById(attribute.id) as Promise<AttributeDefinitionEntity>;
  }

  async update(
    id: string,
    data: UpdateAttributeDefinitionData,
  ): Promise<AttributeDefinitionEntity> {
    const existing = await this.attributeRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Attribute definition not found');
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.attributeRepo.findBySlug(data.slug);
      if (slugExists) {
        throw new ConflictException('Attribute definition with this slug already exists');
      }
    }

    const { unitIds, ...updateData } = data;
    const updated = await this.attributeRepo.update(id, updateData);

    // Sync units if provided
    if (unitIds !== undefined) {
      await this.syncAttributeUnits(id, unitIds);
    }

    await this.cacheService.del(this.getCacheKey(id));
    await this.cacheService.del(this.getCacheKeyBySlug(existing.slug));
    if (data.slug && data.slug !== existing.slug) {
      await this.cacheService.del(this.getCacheKeyBySlug(data.slug));
    }

    this.emit('attribute.updated', {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
    });

    return this.attributeRepo.findById(id) as Promise<AttributeDefinitionEntity>;
  }

  async findById(id: string): Promise<AttributeDefinitionEntity> {
    return this.cacheService.wrap(
      this.getCacheKey(id),
      async () => {
        const attribute = await this.attributeRepo.findById(id);
        if (!attribute) {
          throw new NotFoundException('Attribute definition not found');
        }
        return attribute;
      },
      this.ttl,
    );
  }

  async findBySlug(slug: string): Promise<AttributeDefinitionEntity> {
    return this.cacheService.wrap(
      this.getCacheKeyBySlug(slug),
      async () => {
        const attribute = await this.attributeRepo.findBySlug(slug);
        if (!attribute) {
          throw new NotFoundException('Attribute definition not found');
        }
        return attribute;
      },
      this.ttl,
    );
  }

  async findByDataType(dataType: AttributeDataType): Promise<AttributeDefinitionEntity[]> {
    return this.attributeRepo.findByDataType(dataType);
  }

  async findByGroup(group: string): Promise<AttributeDefinitionEntity[]> {
    return this.attributeRepo.findByGroup(group);
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<{ data: AttributeDefinitionEntity[]; total: number }> {
    return this.attributeRepo.findAll(params);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.attributeRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Attribute definition not found');
    }

    await this.attributeRepo.delete(id);

    await this.cacheService.del(this.getCacheKey(id));
    await this.cacheService.del(this.getCacheKeyBySlug(existing.slug));

    this.emit('attribute.deleted', {
      id,
      slug: existing.slug,
    });
  }
}
