import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { ImportJobCreatedEvent } from '../events';
import { ImportProgressService } from './import-progress.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SimpleProductImportProcessorService {
  private readonly logger = new Logger(SimpleProductImportProcessorService.name);

  constructor(
    private readonly progressService: ImportProgressService,
    @InjectQueue('simple-product-import') private readonly simpleProductImportQueue: Queue,
  ) {}

  /**
   * Handle CSV and ZIP file import jobs for SIMPLE_PRODUCTS by enqueuing to BullMQ
   */
  @OnEvent(IMPORT_EVENTS.JOB_CREATED, { async: true })
  async handleJobCreated(event: ImportJobCreatedEvent): Promise<void> {
    this.logger.log(
      `Checking import job: ${event.jobId}, type: ${event.type}, importType: ${event.importType}`,
    );

    // Only process SIMPLE_PRODUCTS import types
    if (!event.importType || event.importType !== 'SIMPLE_PRODUCTS') {
      return;
    }

    this.logger.log(`Enqueueing simple product import job to BullMQ: ${event.jobId}`);

    try {
      await this.simpleProductImportQueue.add(
        'process-simple-product-import',
        {
          jobId: event.jobId,
          fileUrl: event.fileUrl,
          fileName: event.fileName,
          fileSize: event.fileSize,
          workerId: `simple-product-worker-${process.pid}`,
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

      this.logger.log(`Simple product import job ${event.jobId} enqueued to BullMQ successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue simple product import job ${event.jobId}: ${errorMessage}`,
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
