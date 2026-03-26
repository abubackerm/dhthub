import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { ImportErrorEntity } from '../entities';

@Injectable()
export class ImportErrorRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<ImportErrorEntity[]> {
    return this.getClient().importError.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ImportErrorEntity | null> {
    return this.getClient().importError.findUnique({
      where: { id },
    });
  }

  async findByJobId(jobId: string): Promise<ImportErrorEntity[]> {
    return this.getClient().importError.findMany({
      where: { jobId },
      orderBy: { rowNumber: 'asc' },
    });
  }

  async findByJobIdPaginated(
    jobId: string,
    options: { limit: number; offset: number },
  ): Promise<{ errors: ImportErrorEntity[]; total: number }> {
    const [errors, total] = await Promise.all([
      this.getClient().importError.findMany({
        where: { jobId },
        orderBy: { rowNumber: 'asc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.getClient().importError.count({ where: { jobId } }),
    ]);

    return { errors, total };
  }

  async create(data: {
    jobId: string;
    rowNumber: number;
    sku?: string | null;
    message: string;
    rawData?: any;
    sourceFile?: string;
  }): Promise<ImportErrorEntity> {
    return this.getClient().importError.create({
      data: {
        jobId: data.jobId,
        rowNumber: data.rowNumber,
        sku: data.sku ?? null,
        message: data.message,
        rawData: data.rawData ?? null,
        sourceFile: data.sourceFile ?? null,
      },
    });
  }

  async createMany(
    data: Array<{
      jobId: string;
      rowNumber: number;
      sku?: string | null;
      message: string;
      rawData?: any;
    }>,
  ): Promise<{ count: number }> {
    return this.getClient().importError.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async delete(id: string): Promise<ImportErrorEntity> {
    return this.getClient().importError.delete({
      where: { id },
    });
  }

  async deleteByJobId(jobId: string): Promise<{ count: number }> {
    return this.getClient().importError.deleteMany({
      where: { jobId },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().importError.count({ where });
  }

  async countByJobId(jobId: string): Promise<number> {
    return this.getClient().importError.count({ where: { jobId } });
  }
}
