import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { BaseService } from '@shared/domain';
import { UnitDefinitionRepository } from '../repositories';
import { UnitDefinitionEntity } from '../entities';
import { CacheService } from '@core/cache';

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
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    super(eventEmitter);
  }

  private get ttl(): number {
    return this.configService.get('cache.ttl.unitDefinition') ?? 7200;
  }

  private getCacheKey(id: string): string {
    return `unit:${id}`;
  }

  private getCacheKeyByName(name: string): string {
    return `unit:name:${name}`;
  }

  async create(data: CreateUnitData): Promise<UnitDefinitionEntity> {
    const existing = await this.unitRepo.findByName(data.name);
    if (existing) {
      throw new ConflictException('Unit with this name already exists');
    }

    const unit = await this.unitRepo.create(data);

    await this.cacheService.del('units:all');

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

    await this.cacheService.del(this.getCacheKey(id));
    await this.cacheService.del(this.getCacheKeyByName(existing.name));
    if (data.name && data.name !== existing.name) {
      await this.cacheService.del(this.getCacheKeyByName(data.name));
    }

    this.emit('unit.updated', {
      id: updated.id,
      name: updated.name,
    });

    return updated;
  }

  async findById(id: string): Promise<UnitDefinitionEntity> {
    return this.cacheService.wrap(
      this.getCacheKey(id),
      async () => {
        const unit = await this.unitRepo.findById(id);
        if (!unit) {
          throw new NotFoundException('Unit not found');
        }
        return unit;
      },
      this.ttl,
    );
  }

  async findByName(name: string): Promise<UnitDefinitionEntity> {
    return this.cacheService.wrap(
      this.getCacheKeyByName(name),
      async () => {
        const unit = await this.unitRepo.findByName(name);
        if (!unit) {
          throw new NotFoundException('Unit not found');
        }
        return unit;
      },
      this.ttl,
    );
  }

  async findAll(): Promise<UnitDefinitionEntity[]> {
    return this.cacheService.wrap(
      'units:all',
      async () => {
        return this.unitRepo.findAll();
      },
      this.ttl,
    );
  }

  async delete(id: string): Promise<void> {
    const existing = await this.unitRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Unit not found');
    }

    await this.unitRepo.delete(id);

    await this.cacheService.del(this.getCacheKey(id));
    await this.cacheService.del(this.getCacheKeyByName(existing.name));
    await this.cacheService.del('units:all');

    this.emit('unit.deleted', {
      id,
      name: existing.name,
    });
  }
}
