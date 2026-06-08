import { Logger } from '@nestjs/common';
import { Worker, Job as BullJob } from 'bullmq';
import axios from 'axios';
import { QUEUES, createWorker } from './queue.config';

interface ImageImportJobData {
  jobId: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  workerId: string;
  strategy?: 'skip' | 'replace';
}

/**
 * ImageImportWorker - BullMQ worker for processing ZIP-based image imports
 *
 * Features:
 * - Calls API endpoint to process image imports
 * - Progress tracking via job status updates
 * - Error handling and retry logic
 * - Supports concurrent image processing
 */
class ImageImportWorker {
  private readonly logger = new Logger(ImageImportWorker.name);
  private readonly worker: Worker;
  private readonly apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

  constructor() {
    this.worker = createWorker(
      QUEUES.IMAGE_PROCESSING,
      this.processJob.bind(this),
      {
        concurrency: 2, // Allow 2 concurrent image imports
        limiter: {
          max: 2, // Max 2 concurrent image imports
          duration: 10000,
        },
      },
    );

    this.setupWorkerEvents();
    this.logger.log('[ImageImportWorker] Initialized and ready to process jobs');
  }

  private setupWorkerEvents(): void {
    this.worker.on('completed', (job: BullJob) => {
      this.logger.log(`[ImageImportWorker] Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job: BullJob | undefined, error: Error) => {
      this.logger.error(`[ImageImportWorker] Job ${job?.id} failed: ${error.message}`, error.stack);
    });

    this.worker.on('error', (error) => {
      this.logger.error(`[ImageImportWorker] Worker error: ${error.message}`, error.stack);
    });
  }

  /**
   * Main job processor - delegates processing to API
   */
  private async processJob(job: BullJob<ImageImportJobData>): Promise<void> {
    // Only process image import jobs, ignore other jobs on the same queue
    if (job.name !== 'process-image-import') {
      this.logger.debug(`[ImageImportWorker] Skipping job ${job.id} with name ${job.name} (not an image import job)`);
      return;
    }

    const { jobId, fileUrl, fileName, strategy } = job.data;

    this.logger.log(`[ImageImportWorker] Starting processing for job ${jobId} (file: ${fileName}, strategy: ${strategy || 'replace'})`);
    job.updateProgress(10);

    try {
      // Call API to process image import
      const response = await this.callApi('/v1/import/worker/process-images', { jobId, fileUrl, strategy });

      job.updateProgress(100);
      this.logger.log(`[ImageImportWorker] Job ${jobId} completed successfully. Processed ${response.processedCount} images`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImportWorker] Job ${jobId} error: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Call API endpoint with job data
   * Note: BullMQ handles retries, so we don't retry internally
   */
  private async callApi(endpoint: string, data: any): Promise<any> {
    try {
      this.logger.log(`[ImageImportWorker] Calling API endpoint: ${endpoint}`);
      const response = await axios.post(`${this.apiBaseUrl}${endpoint}`, data, {
        timeout: 300000, // 5 minute timeout for image processing
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`[ImageImportWorker] API call to ${endpoint} succeeded (status ${response.status})`);
        return response.data;
      }

      throw new Error(`API returned status ${response.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImportWorker] API call to ${endpoint} failed: ${errorMessage}`);
      throw error; // Let BullMQ handle retries
    }
  }

  /**
   * Start worker
   */
  async start(): Promise<void> {
    await this.worker.waitUntilReady();
    this.logger.log('ImageImportWorker started and ready');
  }

  /**
   * Stop worker
   */
  async stop(): Promise<void> {
    await this.worker.close();
    this.logger.log('ImageImportWorker stopped');
  }
}

// Only auto-start if this file is run directly (not when imported via index.ts)
if (require.main === module) {
  const imageImportWorker = new ImageImportWorker();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down image import worker...');
    await imageImportWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down image import worker...');
    await imageImportWorker.stop();
    process.exit(0);
  });

  // Start worker
  imageImportWorker.start().catch((error) => {
    console.error('Failed to start ImageImportWorker:', error);
    process.exit(1);
  });
}

export { ImageImportWorker };
