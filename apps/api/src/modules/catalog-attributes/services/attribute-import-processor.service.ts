import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { ImportJobCreatedEvent } from '@modules/import/events';
import { ImportProgressService } from '@modules/import/services/import-progress.service';
import { ImportFileType } from '@modules/import/entities';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AttributeImportProcessorService {
  private readonly logger = new Logger(AttributeImportProcessorService.name);

  constructor(
    private readonly progressService: ImportProgressService,
    @InjectQueue('attribute-import') private readonly attributeImportQueue: Queue,
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

    // Only process ATTRIBUTES import types (handle null importType as well)
    if (!event.importType || event.importType !== 'ATTRIBUTES') {
      return;
    }

    this.logger.log(`Enqueueing attribute import job to BullMQ: ${event.jobId}`);

    try {
      // Enqueue job to BullMQ for standalone worker to process
      await this.attributeImportQueue.add(
        'process-attribute-import',
        {
          jobId: event.jobId,
          fileUrl: event.fileUrl,
          fileName: event.fileName,
          fileSize: event.fileSize,
          workerId: `attribute-worker-${process.pid}`,
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

      this.logger.log(`Attribute import job ${event.jobId} enqueued to BullMQ successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue attribute import job ${event.jobId}: ${errorMessage}`,
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
