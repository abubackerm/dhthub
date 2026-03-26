import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { ImportJobCreatedEvent } from '../events';
import { ImportProgressService } from './import-progress.service';
import { ImportFileType } from '../entities';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CategoryImportProcessorService {
  private readonly logger = new Logger(CategoryImportProcessorService.name);

  constructor(
    private readonly progressService: ImportProgressService,
    @InjectQueue('category-import') private readonly categoryImportQueue: Queue,
  ) {}

  /**
   * Handle CSV category import jobs by enqueuing to BullMQ
   */
  @OnEvent(IMPORT_EVENTS.JOB_CREATED, { async: true })
  async handleJobCreated(event: ImportJobCreatedEvent): Promise<void> {
    this.logger.log(`Checking import job: ${event.jobId}, type: ${event.type}, importType: ${event.importType}`);

    // Only process CSV file types with this processor
    if (event.type !== ImportFileType.CSV) {
      return;
    }

    // Only process CATEGORY_CREATE, CATEGORY_UPDATE, or CATEGORY_EDIT import types
    if (
      !event.importType ||
      (event.importType !== 'CATEGORY_CREATE' &&
       event.importType !== 'CATEGORY_UPDATE' &&
       event.importType !== 'CATEGORY_EDIT')
    ) {
      return;
    }

    this.logger.log(`Enqueueing category import job to BullMQ: ${event.jobId}, type: ${event.importType}`);

    try {
      // Enqueue job to BullMQ for standalone worker to process
      await this.categoryImportQueue.add(
        `process-category-${event.importType.toLowerCase()}`,
        {
          jobId: event.jobId,
          fileUrl: event.fileUrl,
          fileName: event.fileName,
          fileSize: event.fileSize,
          workerId: `category-worker-${process.pid}`,
          importType: event.importType,
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

      this.logger.log(`Category import job ${event.jobId} enqueued to BullMQ successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue category import job ${event.jobId}: ${errorMessage}`,
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
