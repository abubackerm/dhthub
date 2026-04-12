import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { UnitDefinitionRepository } from '../repositories';
import { UnitDefinitionEntity } from '../entities';

export interface CreateUnitData {
  name: string;
}

export interface UpdateUnitData {
  name?: string;
}

@Injectable()
export class UnitService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly unitRepo: UnitDefinitionRepository,
  ) {
    super(eventEmitter);
  }

  async create(data: CreateUnitData): Promise<UnitDefinitionEntity> {
    const existing = await this.unitRepo.findByName(data.name);
    if (existing) {
      throw new ConflictException('Unit with this name already exists');
    }

    const unit = await this.unitRepo.create(data);

    this.emit('unit.created', {
      id: unit.id,
      name: unit.name,
    });

    return unit;
  }

  async update(id: string, data: UpdateUnitData): Promise<UnitDefinitionEntity> {
    const existing = await this.unitRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Unit not found');
    }

    if (data.name && data.name !== existing.name) {
      const nameExists = await this.unitRepo.findByName(data.name);
      if (nameExists) {
        throw new ConflictException('Unit with this name already exists');
      }
    }

    const updated = await this.unitRepo.update(id, data);

    this.emit('unit.updated', {
      id: updated.id,
      name: updated.name,
    });

    return updated;
  }

  async findById(id: string): Promise<UnitDefinitionEntity> {
    const unit = await this.unitRepo.findById(id);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit;
  }

  async findByName(name: string): Promise<UnitDefinitionEntity> {
    const unit = await this.unitRepo.findByName(name);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit;
  }

  async findAll(): Promise<UnitDefinitionEntity[]> {
    return this.unitRepo.findAll();
  }

  async delete(id: string): Promise<void> {
    const existing = await this.unitRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Unit not found');
    }

    await this.unitRepo.delete(id);

    this.emit('unit.deleted', {
      id,
      name: existing.name,
    });
  }
}
