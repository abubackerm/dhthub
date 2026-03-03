import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { MembershipEntity, MembershipStatus } from '../entities';

@Injectable()
export class MembershipRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<MembershipEntity[]> {
    return this.getClient().membership.findMany();
  }

  async findById(id: string): Promise<MembershipEntity | null> {
    return this.getClient().membership.findUnique({
      where: { id },
    });
  }

  async findByUserIdAndOrganizationId(
    userId: string,
    organizationId: string,
  ): Promise<MembershipEntity | null> {
    return this.getClient().membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
    });
  }

  async findByUserId(userId: string): Promise<MembershipEntity[]> {
    return this.getClient().membership.findMany({
      where: { userId },
    });
  }

  async findByOrganizationId(organizationId: string): Promise<MembershipEntity[]> {
    return this.getClient().membership.findMany({
      where: { organizationId },
    });
  }

  async findByOrganizationIdAndStatus(
    organizationId: string,
    status: MembershipStatus,
  ): Promise<MembershipEntity[]> {
    return this.getClient().membership.findMany({
      where: { organizationId, status },
    });
  }

  async create(data: {
    userId: string;
    organizationId: string;
    roleId: string;
    status?: MembershipStatus;
  }): Promise<MembershipEntity> {
    return this.getClient().membership.create({
      data,
    });
  }

  async update(
    id: string,
    data: Partial<{
      roleId: string;
      status: MembershipStatus;
    }>,
  ): Promise<MembershipEntity> {
    return this.getClient().membership.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: MembershipStatus,
  ): Promise<MembershipEntity> {
    return this.getClient().membership.update({
      where: { id },
      data: { status },
    });
  }

  async count(where?: Record<string, any>): Promise<number> {
    return this.getClient().membership.count({ where });
  }

  async countByStatus(
    organizationId: string,
    status: MembershipStatus,
  ): Promise<number> {
    return this.getClient().membership.count({
      where: { organizationId, status },
    });
  }
}
