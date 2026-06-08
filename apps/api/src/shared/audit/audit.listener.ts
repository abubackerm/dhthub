import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from './audit.service';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { ImportJobCreatedEvent } from '@modules/import/events/import-job-created.event';
import { ImportJobCompletedEvent } from '@modules/import/events/import-job-completed.event';
import { ImportJobFailedEvent } from '@modules/import/events/import-job-failed.event';

@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(private readonly auditService: AuditService) {}

  @OnEvent(IMPORT_EVENTS.JOB_CREATED, { async: true })
  async handleJobCreated(event: ImportJobCreatedEvent) {
    this.logger.log(`[AUDIT] Import job created: ${event.jobId}`);

    await this.auditService.log({
      action: 'IMPORT_JOB_CREATED',
      entityType: 'ImportJob',
      entityId: event.jobId,
      performedBy: event.createdBy ?? 'system',
      metadata: {
        fileUrl: event.fileUrl,
        fileName: event.fileName,
        fileSize: event.fileSize,
        fileType: event.type,
        totalRows: event.totalRows,
        importType: event.importType,
        strategy: event.strategy,
      },
      occurredAt: event.occurredAt,
    });
  }

  @OnEvent(IMPORT_EVENTS.JOB_STARTED, { async: true })
  async handleJobStarted(event: { jobId: string }) {
    this.logger.log(`[AUDIT] Import job started: ${event.jobId}`);

    await this.auditService.log({
      action: 'IMPORT_JOB_STARTED',
      entityType: 'ImportJob',
      entityId: event.jobId,
      performedBy: 'system',
      metadata: {
        jobId: event.jobId,
      },
    });
  }

  @OnEvent(IMPORT_EVENTS.JOB_COMPLETED, { async: true })
  async handleJobCompleted(event: ImportJobCompletedEvent) {
    this.logger.log(`[AUDIT] Import job completed: ${event.jobId}`);

    await this.auditService.log({
      action: 'IMPORT_JOB_COMPLETED',
      entityType: 'ImportJob',
      entityId: event.jobId,
      performedBy: 'system',
      metadata: {
        totalRows: event.totalRows,
        processedRows: event.processedRows,
        successRows: event.successRows,
        failedRows: event.failedRows,
        duration: event.duration,
        rowsPerSecond: event.rowsPerSecond,
      },
      occurredAt: event.occurredAt,
    });
  }

  @OnEvent(IMPORT_EVENTS.JOB_FAILED, { async: true })
  async handleJobFailed(event: ImportJobFailedEvent) {
    this.logger.log(`[AUDIT] Import job failed: ${event.jobId}`);

    await this.auditService.log({
      action: 'IMPORT_JOB_FAILED',
      entityType: 'ImportJob',
      entityId: event.jobId,
      performedBy: 'system',
      metadata: {
        totalRows: event.totalRows,
        processedRows: event.processedRows,
        successRows: event.successRows,
        failedRows: event.failedRows,
        error: event.error,
      },
      occurredAt: event.occurredAt,
    });
  }

  @OnEvent(IMPORT_EVENTS.BATCH_PROCESSED, { async: true })
  async handleBatchProcessed(event: { jobId: string; batchNumber: number; batchSize: number }) {
    this.logger.debug(`[AUDIT] Import batch processed: ${event.jobId} - Batch ${event.batchNumber}`);

    await this.auditService.log({
      action: 'IMPORT_BATCH_PROCESSED',
      entityType: 'ImportJob',
      entityId: event.jobId,
      performedBy: 'system',
      metadata: {
        batchNumber: event.batchNumber,
        batchSize: event.batchSize,
      },
    });
  }
}
