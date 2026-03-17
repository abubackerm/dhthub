import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { AttributeOptionEntity } from '../entities';

@Injectable()
export class AttributeOptionRepository {
  constructor(private readonly db: DatabaseProvider) {}

  public getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<AttributeOptionEntity | null> {
    return this.getClient().attributeOption.findUnique({
      where: { id },
    });
  }

  async findByAttributeId(attributeId: string): Promise<AttributeOptionEntity[]> {
    return this.getClient().attributeOption.findMany({
      where: { attributeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: {
    attributeId: string;
    label: string;
    value: string;
    sortOrder?: number;
  }): Promise<AttributeOptionEntity> {
    return this.getClient().attributeOption.create({
      data: {
        attributeId: data.attributeId,
        label: data.label,
        value: data.value,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      label: string;
      value: string;
      sortOrder: number;
    }>,
  ): Promise<AttributeOptionEntity> {
    return this.getClient().attributeOption.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<AttributeOptionEntity> {
    return this.getClient().attributeOption.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().attributeOption.count({ where });
  }

  async findManyByIds(ids: string[]): Promise<AttributeOptionEntity[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.getClient().attributeOption.findMany({
      where: { id: { in: ids } },
    });
  }

  async findByAttributeIdAndValue(
    attributeId: string,
    value: string,
  ): Promise<AttributeOptionEntity | null> {
    return this.getClient().attributeOption.findUnique({
      where: { attributeId_value: { attributeId, value } },
    });
  }

  async upsertByValue(data: {
    attributeId: string;
    label: string;
    value: string;
    sortOrder?: number;
  }): Promise<AttributeOptionEntity> {
    return this.getClient().attributeOption.upsert({
      where: {
        attributeId_value: {
          attributeId: data.attributeId,
          value: data.value,
        },
      },
      update: {},
      create: {
        attributeId: data.attributeId,
        label: data.label,
        value: data.value,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }
}
