import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { WarehouseRepository } from '../repositories';
import { WarehouseNotFoundError, WarehouseAlreadyExistsError } from '../domain/errors';

@Injectable()
export class WarehouseService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly warehouseRepo: WarehouseRepository,
  ) {
    super(eventEmitter);
  }

  async createWarehouse(
    name: string,
    code: string,
    location?: string | null,
    createdBy?: string,
  ): Promise<any> {
    const existing = await this.warehouseRepo.findByCode(code);
    if (existing) {
      throw new WarehouseAlreadyExistsError(code);
    }

    return this.warehouseRepo.create({
      name,
      code,
      location: location ?? null,
      createdBy,
    });
  }

  async getWarehouses(): Promise<any[]> {
    return this.warehouseRepo.findAll();
  }

  async getWarehouse(id: string): Promise<any> {
    const warehouse = await this.warehouseRepo.findById(id);
    if (!warehouse) {
      throw new WarehouseNotFoundError(id);
    }
    return warehouse;
  }

  async updateWarehouse(
    id: string,
    data: {
      name?: string;
      location?: string | null;
      updatedBy?: string;
    },
  ): Promise<any> {
    const warehouse = await this.warehouseRepo.findById(id);
    if (!warehouse) {
      throw new WarehouseNotFoundError(id);
    }

    return this.warehouseRepo.update(id, data);
  }

  async deleteWarehouse(id: string): Promise<any> {
    const warehouse = await this.warehouseRepo.findById(id);
    if (!warehouse) {
      throw new WarehouseNotFoundError(id);
    }

    return this.warehouseRepo.delete(id);
  }
}
