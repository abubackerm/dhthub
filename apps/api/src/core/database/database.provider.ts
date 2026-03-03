import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

export type PrismaDelegate<T> = {
  findMany: (args?: any) => Promise<T[]>;
  findUnique: (args: any) => Promise<T | null>;
  findFirst: (args?: any) => Promise<T | null>;
  create: (args: any) => Promise<T>;
  update: (args: any) => Promise<T>;
  delete: (args: any) => Promise<T>;
  count: (args?: any) => Promise<number>;
};

export type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class DatabaseProvider {
  constructor(private readonly prisma: PrismaService) {}

  get user(): PrismaDelegate<any> {
    return this.prisma.user;
  }

  get organization(): PrismaDelegate<any> {
    return this.prisma.organization;
  }

  get membership(): PrismaDelegate<any> {
    return this.prisma.membership;
  }

  get role(): PrismaDelegate<any> {
    return this.prisma.role;
  }

  /**
   * Execute a callback within a database transaction.
   * Used for atomic operations like order creation + inventory reservation + payment record.
   *
   * @example
   * await this.db.runInTransaction(async (tx) => {
   *   await tx.order.create({ data: orderData });
   *   await tx.inventory.update({ where: { id }, data: { quantity: { decrement: 1 } } });
   *   await tx.payment.create({ data: paymentData });
   * });
   */
  async runInTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  get $queryRaw() {
    return this.prisma.$queryRaw.bind(this.prisma);
  }

  get $executeRaw() {
    return this.prisma.$executeRaw.bind(this.prisma);
  }
}
