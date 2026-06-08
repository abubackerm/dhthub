import { AsyncLocalStorage } from 'async_hooks';
import { TransactionClient } from './database.provider';

/**
 * Ambient transaction context using AsyncLocalStorage.
 * Allows repositories to access the current transaction
 * without explicit parameter passing.
 *
 * Flow:
 * 1. PrismaTransactionalExecutor stores tx in context
 * 2. Repositories check context for active transaction
 * 3. If found, use transaction client; otherwise use main client
 */
export const transactionContext = new AsyncLocalStorage<TransactionClient>();
