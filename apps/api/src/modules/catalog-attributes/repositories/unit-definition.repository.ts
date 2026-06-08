import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { UnitDefinitionEntity } from '../entities';

@Injectable()
export class UnitDefinitionRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<UnitDefinitionEntity | null> {
    return this.getClient().unitDefinition.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<UnitDefinitionEntity | null> {
    return this.getClient().unitDefinition.findUnique({
      where: { name },
    });
  }

  async findAll(): Promise<UnitDefinitionEntity[]> {
    return this.getClient().unitDefinition.findMany();
  }

  async create(data: {
    name: string;
  }): Promise<UnitDefinitionEntity> {
    return this.getClient().unitDefinition.create({
      data,
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
    }>,
  ): Promise<UnitDefinitionEntity> {
    return this.getClient().unitDefinition.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<UnitDefinitionEntity> {
    return this.getClient().unitDefinition.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().unitDefinition.count({ where });
  }
}
