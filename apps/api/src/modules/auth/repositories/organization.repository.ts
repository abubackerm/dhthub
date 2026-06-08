import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { OrganizationEntity } from '../entities';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<OrganizationEntity[]> {
    return this.getClient().organization.findMany();
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    return this.getClient().organization.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    return this.getClient().organization.findUnique({
      where: { slug },
    });
  }

  async findByOwnerId(ownerId: string): Promise<OrganizationEntity[]> {
    return this.getClient().organization.findMany({
      where: { ownerId },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    ownerId: string;
  }): Promise<OrganizationEntity> {
    return this.getClient().organization.create({
      data,
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      ownerId: string;
      isArchived: boolean;
    }>,
  ): Promise<OrganizationEntity> {
    return this.getClient().organization.update({
      where: { id },
      data,
    });
  }

  async archive(id: string): Promise<OrganizationEntity> {
    return this.getClient().organization.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async delete(id: string): Promise<OrganizationEntity> {
    return this.getClient().organization.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, any>): Promise<number> {
    return this.getClient().organization.count({ where });
  }
}
