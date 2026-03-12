import { Injectable, Logger } from '@nestjs/common';
import { ImportJobRepository } from '../repositories/import-job.repository';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { ImportJobStatus } from '../entities/import-job-status.enum';
import { ValidationError } from './import-validation.service';

export interface ProgressUpdate {
  jobId: string;
  processedRows: number;
  successRows: number;
  failedRows: number;
  lastProcessedRow: number;
}

export interface ImportMetrics {
  totalRows: number | null;
  processedRows: number;
  successRows: number;
  failedRows: number;
  remainingRows: number;
  progressPercent: number;
  duration: number;
  estimatedTimeRemaining: number | null;
  rowsPerSecond: number;
}

@Injectable()
export class ImportProgressService {
  private readonly logger = new Logger(ImportProgressService.name);

  constructor(
    private readonly importJobRepository: ImportJobRepository,
    private readonly importErrorRepository: ImportErrorRepository,
  ) {}

  /**
   * Update job progress with batch processing results
   */
  async updateProgress(update: ProgressUpdate): Promise<void> {
    try {
      await this.importJobRepository.updateProgress(update.jobId, {
        processedRows: update.processedRows,
        successRows: update.successRows,
        failedRows: update.failedRows,
        lastProcessedRow: update.lastProcessedRow,
      });

      this.logger.debug(
        `Job ${update.jobId} progress: ${update.processedRows} rows processed`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update progress for job ${update.jobId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Mark job as completed with final metrics
   */
  async markCompleted(jobId: string): Promise<void> {
    try {
      const job = await this.importJobRepository.findById(jobId);
      if (!job) {
        throw new Error(`Import job not found: ${jobId}`);
      }

      const duration = job.startedAt
        ? Date.now() - job.startedAt.getTime()
        : 0;

      await this.importJobRepository.markAsCompleted(jobId);

      this.logger.log(
        `Job ${jobId} completed: ${job.processedRows} rows processed in ${this.formatDuration(duration)}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to mark job ${jobId} as completed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Mark job as failed with error details
   */
  async markFailed(jobId: string, error: Error): Promise<void> {
    try {
      await this.importJobRepository.markAsFailed(jobId);

      this.logger.error(
        `Job ${jobId} failed: ${error.message}`,
        error.stack,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to mark job ${jobId} as failed: ${errorMessage}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  /**
   * Record validation errors for a batch
   */
  async recordErrors(
    jobId: string,
    errors: ValidationError[],
  ): Promise<void> {
    if (errors.length === 0) {
      return;
    }

    try {
      const errorRecords = errors.map((e) => ({
        jobId,
        rowNumber: e.rowNumber,
        sku: e.sku ?? null,
        message: `${e.field ? `[${e.field}] ` : ''}${e.message}`,
      }));

      await this.importErrorRepository.createMany(errorRecords);

      this.logger.debug(
        `Recorded ${errors.length} errors for job ${jobId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to record errors for job ${jobId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get job metrics for monitoring
   */
  async getMetrics(jobId: string): Promise<ImportMetrics | null> {
    try {
      const job = await this.importJobRepository.findById(jobId);
      if (!job) {
        return null;
      }

      const duration = job.startedAt
        ? Date.now() - job.startedAt.getTime()
        : 0;

      const remainingRows = job.totalRows
        ? job.totalRows - job.processedRows
        : 0;

      const progressPercent = job.totalRows
        ? (job.processedRows / job.totalRows) * 100
        : 0;

      const rowsPerSecond = duration > 0
        ? job.processedRows / (duration / 1000)
        : 0;

      const estimatedTimeRemaining = job.totalRows && rowsPerSecond > 0
        ? (remainingRows / rowsPerSecond) * 1000
        : null;

      return {
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successRows: job.successRows,
        failedRows: job.failedRows,
        remainingRows,
        progressPercent,
        duration,
        estimatedTimeRemaining,
        rowsPerSecond,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get metrics for job ${jobId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Check if job should be cancelled (worker checks this periodically)
   */
  async shouldCancel(jobId: string): Promise<boolean> {
    try {
      const job = await this.importJobRepository.findById(jobId);
      if (!job) {
        return false;
      }

      return job.status === ImportJobStatus.CANCELLED;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to check cancel status for job ${jobId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  /**
   * Calculate batch progress for logging
   */
  calculateBatchProgress(
    batchStartRow: number,
    batchEndRow: number,
    totalRows: number | null,
  ): { processedInBatch: number; overallProgress: number } {
    const processedInBatch = batchEndRow - batchStartRow + 1;
    const overallProgress = totalRows
      ? (batchEndRow / totalRows) * 100
      : 0;

    return {
      processedInBatch,
      overallProgress,
    };
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
