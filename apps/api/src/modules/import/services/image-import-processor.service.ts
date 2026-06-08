import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { ImportJobCreatedEvent } from '../events';
import { ImportFileType } from '../entities';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ImageImportProcessorService {
  private readonly logger = new Logger(ImageImportProcessorService.name);

  constructor(
    @InjectQueue('image-processing') private readonly imageProcessingQueue: Queue,
  ) {}

  /**
   * Handle image import jobs by enqueuing to BullMQ
   */
  @OnEvent(IMPORT_EVENTS.JOB_CREATED, { async: true })
  async handleJobCreated(event: ImportJobCreatedEvent): Promise<void> {
    this.logger.log(`[ImageImportProcessor] Checking import job: ${event.jobId}, type: ${event.type}, importType: "${event.importType}"`);

    // Only process ZIP file types with this processor
    if (event.type !== ImportFileType.ZIP) {
      this.logger.debug(`[ImageImportProcessor] Skipping job ${event.jobId} - not ZIP type`);
      return;
    }

    // Only process IMAGES import types (case-insensitive and null-safe comparison)
    if (!event.importType || event.importType.toUpperCase() !== 'IMAGES') {
      this.logger.debug(`[ImageImportProcessor] Skipping job ${event.jobId} - importType is "${event.importType}", expected "IMAGES"`);
      return;
    }

    this.logger.log(`[ImageImportProcessor] Enqueueing image import job to BullMQ: ${event.jobId}`);

    try {
      // Enqueue job to BullMQ for standalone worker to process
      await this.imageProcessingQueue.add(
        'process-image-import',
        {
          jobId: event.jobId,
          fileUrl: event.fileUrl,
          fileName: event.fileName,
          fileSize: event.fileSize,
          workerId: `image-worker-${process.pid}`,
          strategy: event.strategy,
        },
        {
          jobId: `image-${event.jobId}`,
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

      this.logger.log(`[ImageImportProcessor] Image import job ${event.jobId} enqueued to BullMQ successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ImageImportProcessor] Failed to enqueue image import job ${event.jobId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
