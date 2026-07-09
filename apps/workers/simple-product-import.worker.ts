import { Logger } from '@nestjs/common';
import { Worker, Job as BullJob } from 'bullmq';
import axios from 'axios';
import { QUEUES, createWorker } from './queue.config';

interface SimpleProductImportJobData {
  jobId: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  workerId: string;
}

/**
 * SimpleProductImportWorker - BullMQ worker for processing ZIP-based
 * simple product imports.
 *
 * Features:
 * - Calls API endpoint to process entire simple product import
 * - Progress tracking via job status updates
 * - Error handling and retry logic
 */
class SimpleProductImportWorker {
  private readonly logger = new Logger(SimpleProductImportWorker.name);
  private readonly worker: Worker;
  private readonly apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

  constructor() {
    this.worker = createWorker(
      QUEUES.SIMPLE_PRODUCT_IMPORT,
      this.processJob.bind(this),
      {
        concurrency: 2,
        limiter: {
          max: 2,
          duration: 1000,
        },
      },
    );

    this.setupWorkerEvents();
    this.logger.log('SimpleProductImportWorker initialized');
  }

  private setupWorkerEvents(): void {
    this.worker.on('completed', (job: BullJob) => {
      this.logger.log(`Simple product import job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job: BullJob | undefined, error: Error) => {
      this.logger.error(
        `Simple product import job ${job?.id} failed: ${error.message}`,
        error.stack,
      );
    });

    this.worker.on('error', (error) => {
      this.logger.error(`SimpleProductImportWorker error: ${error.message}`, error.stack);
    });
  }

  /**
   * Main job processor - delegates processing to API
   */
  private async processJob(job: BullJob<SimpleProductImportJobData>): Promise<void> {
    const { jobId, fileUrl } = job.data;

    this.logger.log(`[simple-product-import.start] Processing job ${jobId}`);
    job.updateProgress(10);

    try {
      // Call API to process the entire simple product import
      await this.callApi('/v1/import/worker/process-simple-products', { jobId, fileUrl });

      job.updateProgress(100);
      this.logger.log(`[simple-product-import.completed] Job ${jobId} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[simple-product-import.error] Job ${jobId} error: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Call API endpoint with job data
   */
  private async callApi(endpoint: string, data: any): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(`${this.apiBaseUrl}${endpoint}`, data, {
          timeout: 600000,
        });

        if (response.status >= 200 && response.status < 300) {
          this.logger.log(`API call to ${endpoint} succeeded (status ${response.status})`);
          return;
        }

        throw new Error(`API returned status ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `API call to ${endpoint} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`,
        );

        if (attempt < maxRetries) {
          await this.sleep(3000 * attempt);
        }
      }
    }

    throw lastError || new Error(`Failed to call API endpoint ${endpoint}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    await this.worker.waitUntilReady();
    this.logger.log('SimpleProductImportWorker started and ready');
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    await this.worker.close();
    this.logger.log('SimpleProductImportWorker stopped');
  }
}

// Only auto-start if this file is run directly (not when imported via index.ts)
if (require.main === module) {
  const simpleProductImportWorker = new SimpleProductImportWorker();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down simple product import worker...');
    await simpleProductImportWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down simple product import worker...');
    await simpleProductImportWorker.stop();
    process.exit(0);
  });

  // Start worker
  simpleProductImportWorker.start().catch((error) => {
    console.error('Failed to start SimpleProductImportWorker:', error);
    process.exit(1);
  });
}

export { SimpleProductImportWorker };
