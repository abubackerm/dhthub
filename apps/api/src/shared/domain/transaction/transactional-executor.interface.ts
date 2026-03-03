/**
 * Domain abstraction for transactional operations.
 * Pure interface with no infrastructure dependencies.
 *
 * @example
 * const result = await transactionalExecutor.execute(async () => {
 *   await repositoryA.create(...);
 *   await repositoryB.update(...);
 *   return result;
 * });
 */
export interface TransactionalExecutor {
  /**
   * Execute an operation within a transactional context.
   * All database operations within the callback will be atomic.
   *
   * @param operation - The async operation to execute
   * @returns The result of the operation
   * @throws Re-throws any error from the operation, rolling back the transaction
   */
  execute<T>(operation: () => Promise<T>): Promise<T>;
}
