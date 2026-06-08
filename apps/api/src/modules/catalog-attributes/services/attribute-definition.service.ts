import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { AttributeDefinitionRepository } from '../repositories';
import { AttributeDefinitionEntity, AttributeDataType, AttributeFilterType } from '../entities';

export interface CreateAttributeDefinitionData {
  name: string;
  slug?: string;
  dataType: AttributeDataType;
  group?: string | null;
  sortOrder?: number;
  filterType?: AttributeFilterType | null;
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
  isFilterable?: boolean;
  isRequired?: boolean;
  updatedBy?: string;
}

@Injectable()
export class AttributeDefinitionService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly attributeRepo: AttributeDefinitionRepository,
  ) {
    super(eventEmitter);
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

    const updated = await this.attributeRepo.update(id, data);

    this.emit('attribute.updated', {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
    });

    return this.attributeRepo.findById(id) as Promise<AttributeDefinitionEntity>;
  }

  async findById(id: string): Promise<AttributeDefinitionEntity> {
    const attribute = await this.attributeRepo.findById(id);
    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }
    return attribute;
  }

  async findBySlug(slug: string): Promise<AttributeDefinitionEntity> {
    const attribute = await this.attributeRepo.findBySlug(slug);
    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }
    return attribute;
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

    this.emit('attribute.deleted', {
      id,
      slug: existing.slug,
    });
  }
}
