import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { RoleEntity, RolePermissions } from '../entities';

@Injectable()
export class RoleRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.getClient().role.findMany();
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return this.getClient().role.findUnique({
      where: { id },
    });
  }

  async findByNameAndOrganizationId(
    name: string,
    organizationId: string,
  ): Promise<RoleEntity | null> {
    return this.getClient().role.findUnique({
      where: {
        name_organizationId: { name, organizationId },
      },
    });
  }

  async findByOrganizationId(organizationId: string): Promise<RoleEntity[]> {
    return this.getClient().role.findMany({
      where: { organizationId },
    });
  }

  async create(data: {
    name: string;
    permissions?: RolePermissions;
    organizationId: string;
    isSystemRole?: boolean;
  }): Promise<RoleEntity> {
    return this.getClient().role.create({
      data,
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      permissions: RolePermissions;
    }>,
  ): Promise<RoleEntity> {
    return this.getClient().role.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<RoleEntity> {
    return this.getClient().role.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, any>): Promise<number> {
    return this.getClient().role.count({ where });
  }
}
