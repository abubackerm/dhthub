import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { UserEntity } from '../entities';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<UserEntity[]> {
    return this.getClient().user.findMany();
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.getClient().user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.getClient().user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<UserEntity> {
    return this.getClient().user.create({
      data,
    });
  }

  async update(
    id: string,
    data: Partial<{
      email: string;
      passwordHash: string;
      name: string;
      isActive: boolean;
      lastLoginAt: Date;
    }>,
  ): Promise<UserEntity> {
    return this.getClient().user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<UserEntity> {
    return this.getClient().user.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, any>): Promise<number> {
    return this.getClient().user.count({ where });
  }
}
