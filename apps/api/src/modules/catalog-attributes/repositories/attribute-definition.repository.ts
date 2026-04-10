import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { AttributeDefinitionEntity, AttributeDataType, AttributeFilterType } from '../entities';

@Injectable()
export class AttributeDefinitionRepository {
  constructor(private readonly db: DatabaseProvider) {}

  getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<AttributeDefinitionEntity | null> {
    return this.getClient().attributeDefinition.findUnique({
      where: { id },
      include: {
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });
  }

  async findBySlug(slug: string): Promise<AttributeDefinitionEntity | null> {
    return this.getClient().attributeDefinition.findUnique({
      where: { slug },
    });
  }

  async findByDataType(dataType: AttributeDataType): Promise<AttributeDefinitionEntity[]> {
    return this.getClient().attributeDefinition.findMany({
      where: { dataType },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByGroup(group: string): Promise<AttributeDefinitionEntity[]> {
    return this.getClient().attributeDefinition.findMany({
      where: { group },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    dataType: AttributeDataType;
    group?: string | null;
    sortOrder?: number;
    filterType?: AttributeFilterType | null;
    unitId?: string | null;
    isFilterable?: boolean;
    isRequired?: boolean;
    createdBy?: string;
  }): Promise<AttributeDefinitionEntity> {
    return this.getClient().attributeDefinition.create({
      data: {
        name: data.name,
        slug: data.slug,
        dataType: data.dataType,
        group: data.group ?? null,
        sortOrder: data.sortOrder ?? 0,
        filterType: data.filterType ?? null,
        unitId: data.unitId ?? null,
        isFilterable: data.isFilterable ?? false,
        isRequired: data.isRequired ?? false,
        createdBy: data.createdBy,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      dataType: AttributeDataType;
      group: string | null;
      sortOrder: number;
      filterType: AttributeFilterType | null;
      unitId: string | null;
      isFilterable: boolean;
      isRequired: boolean;
      updatedBy: string;
    }>,
  ): Promise<AttributeDefinitionEntity> {
    return this.getClient().attributeDefinition.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<AttributeDefinitionEntity> {
    return this.getClient().attributeDefinition.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().attributeDefinition.count({ where });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<{ data: AttributeDefinitionEntity[]; total: number }> {
    const { skip, take, search } = params ?? {};
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { group: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [data, total] = await Promise.all([
      this.getClient().attributeDefinition.findMany({
        skip,
        take,
        where,
        orderBy: { sortOrder: 'asc' },
        include: {
          unit: { select: { id: true, name: true, symbol: true } },
        },
      }),
      this.getClient().attributeDefinition.count({ where }),
    ]);

    return { data, total };
  }
}
