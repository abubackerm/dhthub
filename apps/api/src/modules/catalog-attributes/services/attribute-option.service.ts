import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { AttributeOptionRepository } from '../repositories';
import { AttributeDefinitionRepository } from '../repositories/attribute-definition.repository';
import { AttributeOptionEntity } from '../entities';

export interface CreateAttributeOptionData {
  attributeId: string;
  label: string;
  value: string;
  sortOrder?: number;
}

export interface UpdateAttributeOptionData {
  label?: string;
  value?: string;
  sortOrder?: number;
}

@Injectable()
export class AttributeOptionService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly optionRepo: AttributeOptionRepository,
    private readonly attributeRepo: AttributeDefinitionRepository,
  ) {
    super(eventEmitter);
  }

  async create(data: CreateAttributeOptionData): Promise<AttributeOptionEntity> {
    const attribute = await this.attributeRepo.findById(data.attributeId);
    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }

    const existing = await this.optionRepo.findByAttributeId(data.attributeId);
    const duplicate = existing.find((opt) => opt.value === data.value);
    if (duplicate) {
      throw new ConflictException('Attribute option with this value already exists for this attribute');
    }

    const option = await this.optionRepo.create(data);

    this.emit('attribute.option.created', {
      id: option.id,
      attributeId: option.attributeId,
      label: option.label,
    });

    return option;
  }

  async update(
    id: string,
    data: UpdateAttributeOptionData,
  ): Promise<AttributeOptionEntity> {
    const existing = await this.optionRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Attribute option not found');
    }

    const updated = await this.optionRepo.update(id, data);

    this.emit('attribute.option.updated', {
      id: updated.id,
      attributeId: updated.attributeId,
      label: updated.label,
    });

    return updated;
  }

  async findById(id: string): Promise<AttributeOptionEntity> {
    const option = await this.optionRepo.findById(id);
    if (!option) {
      throw new NotFoundException('Attribute option not found');
    }
    return option;
  }

  async findByAttributeId(attributeId: string): Promise<AttributeOptionEntity[]> {
    const attribute = await this.attributeRepo.findById(attributeId);
    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }

    return this.optionRepo.findByAttributeId(attributeId);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.optionRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Attribute option not found');
    }

    await this.optionRepo.delete(id);

    this.emit('attribute.option.deleted', {
      id,
      attributeId: existing.attributeId,
    });
  }
}
