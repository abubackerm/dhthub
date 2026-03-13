import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ImportJobRepository } from '../repositories/import-job.repository';
import { ImportJobEntity, ImportJobStatus, ImportMode } from '../entities';
import { ImportJobNotFoundError } from '../domain/errors/import.errors';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImportJobCreatedEvent } from '../events';
import { IMPORT_EVENTS } from '@shared/events/event-constants';

export interface CreateJobInput {
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  type: 'CSV' | 'JSON';
  totalRows?: number;
  createdBy?: string;
  mode?: ImportMode;
  warehouseId?: string;
  originalFilePath?: string;
}

export interface JobMetrics {
  jobId: string;
  status: ImportJobStatus;
  totalRows: number | null;
  processedRows: number;
  successRows: number;
  failedRows: number;
  duration: number;
  rowsPerSecond: number;
}

@Injectable()
export class ImportJobService {
  private readonly logger = new Logger(ImportJobService.name);

  constructor(
    private readonly importJobRepository: ImportJobRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new import job
   */
  async create(input: CreateJobInput): Promise<ImportJobEntity> {
    this.logger.log(`Creating import job for file: ${input.fileName ?? input.fileUrl}`);

    const job = await this.importJobRepository.create({
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
      type: input.type as any,
      totalRows: input.totalRows,
      createdBy: input.createdBy,
      mode: input.mode ?? null,
      warehouseId: input.warehouseId ?? null,
      originalFilePath: input.originalFilePath ?? null,
    });

    // Emit job created event
    this.eventEmitter.emit(
      IMPORT_EVENTS.JOB_CREATED,
      new ImportJobCreatedEvent(
        job.id,
        job.fileUrl,
        job.fileName,
        job.fileSize,
        job.type,
        job.totalRows,
        job.createdBy,
      ),
    );

    this.logger.log(`Import job created: ${job.id}`);
    return job;
  }

  /**
   * Get job by ID
   */
  async findById(id: string): Promise<ImportJobEntity> {
    const job = await this.importJobRepository.findById(id);
    if (!job) {
      throw new ImportJobNotFoundError(id);
    }
    return job;
  }

  /**
   * Get all jobs with optional filtering
   */
  async findAll(options?: {
    status?: ImportJobStatus;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: ImportJobEntity[]; total: number }> {
    const { status, createdBy, limit, offset } = options ?? {};

    let jobs: ImportJobEntity[];
    let total: number;

    if (status && createdBy) {
      jobs = await this.importJobRepository.findByCreatedBy(createdBy);
      jobs = jobs.filter((j) => j.status === status);
      total = jobs.length;
    } else if (status) {
      jobs = await this.importJobRepository.findByStatus(status);
      total = jobs.length;
    } else if (createdBy) {
      jobs = await this.importJobRepository.findByCreatedBy(createdBy);
      total = jobs.length;
    } else {
      jobs = await this.importJobRepository.findAll();
      total = await this.importJobRepository.count();
    }

    // Apply pagination
    if (limit !== undefined) {
      const start = offset ?? 0;
      jobs = jobs.slice(start, start + limit);
    }

    return { jobs, total };
  }

  /**
   * Cancel a job
   */
  async cancel(id: string): Promise<ImportJobEntity> {
    const job = await this.findById(id);

    if (job.status === ImportJobStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed job');
    }

    if (job.status === ImportJobStatus.FAILED) {
      throw new BadRequestException('Cannot cancel a failed job');
    }

    if (job.status === ImportJobStatus.CANCELLED) {
      return job;
    }

    this.logger.log(`Cancelling import job: ${id}`);
    return this.importJobRepository.cancel(id);
  }

  /**
   * Get job metrics for monitoring
   */
  async getMetrics(id: string): Promise<JobMetrics> {
    const job = await this.findById(id);

    const duration = job.startedAt ? Date.now() - job.startedAt.getTime() : 0;
    const rowsPerSecond = duration > 0 ? job.processedRows / (duration / 1000) : 0;

    return {
      jobId: job.id,
      status: job.status,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      duration,
      rowsPerSecond,
    };
  }

  /**
   * Acquire atomic lock for job processing (used by worker)
   */
  async acquireLock(jobId: string, workerId: string): Promise<boolean> {
    return this.importJobRepository.atomicLock(jobId, workerId);
  }

  /**
   * Mark job as processing (used by worker after acquiring lock)
   */
  async markAsProcessing(jobId: string, workerId: string): Promise<ImportJobEntity> {
    this.logger.log(`Marking job ${jobId} as processing by worker ${workerId}`);
    return this.importJobRepository.markAsProcessing(jobId, workerId);
  }

  /**
   * Mark job as completed (used by worker)
   */
  async markAsCompleted(jobId: string): Promise<ImportJobEntity> {
    this.logger.log(`Marking job ${jobId} as completed`);
    return this.importJobRepository.markAsCompleted(jobId);
  }

  /**
   * Mark job as failed (used by worker)
   */
  async markAsFailed(jobId: string): Promise<ImportJobEntity> {
    this.logger.error(`Marking job ${jobId} as failed`);
    return this.importJobRepository.markAsFailed(jobId);
  }

  /**
   * Delete a job (admin use)
   */
  async delete(id: string): Promise<ImportJobEntity> {
    const job = await this.findById(id);

    if (job.status === ImportJobStatus.PROCESSING) {
      throw new BadRequestException('Cannot delete a job that is currently processing');
    }

    this.logger.log(`Deleting import job: ${id}`);
    return this.importJobRepository.delete(id);
  }

  /**
   * Get pending jobs for processing (used by worker)
   */
  async getPendingJobs(): Promise<ImportJobEntity[]> {
    return this.importJobRepository.findPendingJobs();
  }
}
