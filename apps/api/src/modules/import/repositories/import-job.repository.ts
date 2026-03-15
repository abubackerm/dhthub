import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { ImportJobEntity, ImportJobStatus, ImportFileType, ImportMode } from '../entities';

@Injectable()
export class ImportJobRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findAll(): Promise<ImportJobEntity[]> {
    return this.getClient().importJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ImportJobEntity | null> {
    return this.getClient().importJob.findUnique({
      where: { id },
    });
  }

  async findByStatus(status: ImportJobStatus): Promise<ImportJobEntity[]> {
    return this.getClient().importJob.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findPendingJobs(): Promise<ImportJobEntity[]> {
    return this.findByStatus(ImportJobStatus.PENDING);
  }

  async findByCreatedBy(userId: string): Promise<ImportJobEntity[]> {
    return this.getClient().importJob.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    fileUrl: string;
    fileName?: string | null;
    fileSize?: number | null;
    type: ImportFileType;
    totalRows?: number | null;
    createdBy?: string | null;
    mode?: ImportMode | null;
    warehouseId?: string | null;
    originalFilePath?: string | null;
  }): Promise<ImportJobEntity> {
    return this.getClient().importJob.create({
      data: {
        fileUrl: data.fileUrl,
        fileName: data.fileName ?? null,
        fileSize: data.fileSize ?? null,
        type: data.type,
        totalRows: data.totalRows ?? null,
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        lastProcessedRow: 0,
        status: ImportJobStatus.PENDING,
        createdBy: data.createdBy ?? null,
        mode: data.mode ?? null,
        warehouseId: data.warehouseId ?? null,
        originalFilePath: data.originalFilePath ?? null,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      status: ImportJobStatus;
      totalRows: number | null;
      processedRows: number;
      successRows: number;
      failedRows: number;
      lastProcessedRow: number;
      lockedAt: Date | null;
      lockedBy: string | null;
      startedAt: Date | null;
      finishedAt: Date | null;
    }>,
  ): Promise<ImportJobEntity> {
    return this.getClient().importJob.update({
      where: { id },
      data,
    });
  }

  async updateProgress(
    id: string,
    data: {
      processedRows: number;
      successRows: number;
      failedRows: number;
      lastProcessedRow?: number;
    },
  ): Promise<ImportJobEntity> {
    return this.getClient().importJob.update({
      where: { id },
      data,
    });
  }

  async markAsProcessing(id: string, workerId: string): Promise<ImportJobEntity> {
    return this.getClient().importJob.update({
      where: { id },
      data: {
        status: ImportJobStatus.PROCESSING,
        lockedAt: new Date(),
        lockedBy: workerId,
        startedAt: new Date(),
      },
    });
  }

  async markAsCompleted(id: string): Promise<ImportJobEntity> {
    return this.getClient().importJob.update({
      where: { id },
      data: {
        status: ImportJobStatus.COMPLETED,
        finishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markAsFailed(id: string): Promise<ImportJobEntity> {
    return this.getClient().importJob.update({
      where: { id },
      data: {
        status: ImportJobStatus.FAILED,
        finishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async cancel(id: string): Promise<ImportJobEntity> {
    return this.getClient().importJob.update({
      where: { id },
      data: {
        status: ImportJobStatus.CANCELLED,
        finishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async atomicLock(id: string, workerId: string): Promise<boolean> {
    try {
      await this.getClient().importJob.update({
        where: {
          id,
          status: ImportJobStatus.PENDING,
          lockedAt: null,
        },
        data: {
          status: ImportJobStatus.PROCESSING,
          lockedAt: new Date(),
          lockedBy: workerId,
          startedAt: new Date(),
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async delete(id: string): Promise<ImportJobEntity> {
    return this.getClient().importJob.delete({
      where: { id },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().importJob.count({ where });
  }

  async countByStatus(status: ImportJobStatus): Promise<number> {
    return this.getClient().importJob.count({ where: { status } });
  }
}
