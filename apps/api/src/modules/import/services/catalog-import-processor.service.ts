import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { ImportJobCreatedEvent } from '../events';
import { ImportProgressService } from './import-progress.service';
import { ImportFileType } from '../entities';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CatalogImportProcessorService {
  private readonly logger = new Logger(CatalogImportProcessorService.name);

  constructor(
    private readonly progressService: ImportProgressService,
    @InjectQueue('catalog-import') private readonly catalogImportQueue: Queue,
  ) {}

  /**
   * Handle ZIP file import jobs by enqueuing to BullMQ
   */
  @OnEvent(IMPORT_EVENTS.JOB_CREATED, { async: true })
  async handleJobCreated(event: ImportJobCreatedEvent): Promise<void> {
    this.logger.log(`Checking import job: ${event.jobId}, type: ${event.type}, importType: ${event.importType}`);

    // Only process ZIP file types with this processor
    if (event.type !== ImportFileType.ZIP) {
      return;
    }

    // Only process CATALOG import types
    if (event.importType !== 'CATALOG') {
      return;
    }

    this.logger.log(`Enqueueing catalog import job to BullMQ: ${event.jobId}`);

    try {
      // Enqueue job to BullMQ for the standalone worker to process
      await this.catalogImportQueue.add(
        'process-catalog-import',
        {
          jobId: event.jobId,
          fileUrl: event.fileUrl,
          fileName: event.fileName,
          fileSize: event.fileSize,
          workerId: `catalog-worker-${process.pid}`,
        },
        {
          jobId: event.jobId,
          removeOnComplete: {
            count: 100,
            age: 3600,
          },
          removeOnFail: {
            count: 500,
            age: 7 * 24 * 3600,
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log(`Catalog import job ${event.jobId} enqueued to BullMQ successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue catalog import job ${event.jobId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      try {
        await this.progressService.markFailed(
          event.jobId,
          error instanceof Error ? error : new Error(errorMessage),
        );
      } catch {
        this.logger.error(`Failed to mark job ${event.jobId} as failed`);
      }
    }
  }
}
