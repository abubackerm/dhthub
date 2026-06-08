import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { WarehouseEntity } from '../entities/warehouse.entity';

@Injectable()
export class WarehouseRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<WarehouseEntity[]> {
    return this.getClient().warehouse.findMany();
  }

  async findById(id: string): Promise<WarehouseEntity | null> {
    return this.getClient().warehouse.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<WarehouseEntity | null> {
    return this.getClient().warehouse.findUnique({
      where: { code },
    });
  }

  async create(data: {
    name: string;
    code: string;
    location?: string | null;
    createdBy?: string;
  }): Promise<WarehouseEntity> {
    return this.getClient().warehouse.create({
      data: {
        name: data.name,
        code: data.code,
        location: data.location ?? null,
        createdBy: data.createdBy,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      location?: string | null;
      updatedBy?: string;
    },
  ): Promise<WarehouseEntity> {
    return this.getClient().warehouse.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<WarehouseEntity> {
    return this.getClient().warehouse.delete({
      where: { id },
    });
  }
}
