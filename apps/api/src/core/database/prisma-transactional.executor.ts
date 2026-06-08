import { Injectable } from '@nestjs/common';
import { TransactionalExecutor } from '@shared/domain';
import { DatabaseProvider } from './database.provider';
import { transactionContext } from './transaction-context.store';

/**
 * Prisma implementation of TransactionalExecutor.
 * Wraps operations in database transactions and stores
 * the transaction client in AsyncLocalStorage for ambient access.
 */
@Injectable()
export class PrismaTransactionalExecutor implements TransactionalExecutor {
  constructor(private readonly db: DatabaseProvider) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return this.db.runInTransaction(async (tx) => {
      return transactionContext.run(tx, operation);
    });
  }
}
