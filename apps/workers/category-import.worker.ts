import { Logger } from '@nestjs/common';
import { Worker, Job as BullJob } from 'bullmq';
import axios from 'axios';
import { QUEUES, createWorker } from './queue.config';

interface CategoryImportJobData {
  jobId: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  workerId: string;
  importType: 'CATEGORY_CREATE' | 'CATEGORY_UPDATE' | 'CATEGORY_EDIT';
}

/**
 * CategoryImportWorker - BullMQ worker for processing CSV-based category imports
 *
 * Features:
 * - Routes to appropriate processor based on importType (CREATE or UPDATE)
 * - Calls API endpoint to process category import
 * - Progress tracking via job status updates
 * - Error handling and retry logic
 */
class CategoryImportWorker {
  private readonly logger = new Logger(CategoryImportWorker.name);
  private readonly worker: Worker;
  private readonly apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

  constructor() {
    this.worker = createWorker(
      QUEUES.CATEGORY_IMPORT,
      this.processJob.bind(this),
      {
        concurrency: 2,
        limiter: {
          max: 2, // Max 2 concurrent category imports
          duration: 1000,
        },
      },
    );

    this.setupWorkerEvents();
    this.logger.log('CategoryImportWorker initialized');
  }

  private setupWorkerEvents(): void {
    this.worker.on('completed', (job: BullJob) => {
      this.logger.log(`Category import job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job: BullJob | undefined, error: Error) => {
      this.logger.error(`Category import job ${job?.id} failed: ${error.message}`, error.stack);

      // Mark the job as FAILED in the DB so the frontend stops polling
      if (job?.data?.jobId) {
        this.markJobFailedInDb(job.data.jobId, error.message).catch((err) => {
          this.logger.error(`[category-import] Failed to mark job ${job?.data?.jobId} as failed in DB: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    });

    this.worker.on('error', (error) => {
      this.logger.error(`CategoryImportWorker error: ${error.message}`, error.stack);
    });
  }

  /**
   * Notify the API to mark a job as FAILED in the database
   */
  private async markJobFailedInDb(jobId: string, errorMessage: string): Promise<void> {
    try {
      await axios.post(`${this.apiBaseUrl}/v1/import/worker/mark-failed`, { jobId, errorMessage });
      this.logger.log(`[category-import] Job ${jobId} marked as FAILED in DB`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[category-import] Failed to call mark-failed API for job ${jobId}: ${msg}`);
      throw err;
    }
  }

  /**
   * Main job processor - routes to appropriate processor based on importType
   */
  private async processJob(job: BullJob<CategoryImportJobData>): Promise<void> {
    const { jobId, fileUrl, fileName, importType } = job.data;

    this.logger.log(`[category-import.start] Processing job ${jobId} (type: ${importType})`);
    job.updateProgress(10);

    try {
      // Route to appropriate processor based on importType
      if (importType === 'CATEGORY_CREATE') {
        await this.processCreateImport(jobId, fileUrl, fileName);
      } else if (importType === 'CATEGORY_UPDATE') {
        await this.processUpdateImport(jobId, fileUrl, fileName);
      } else if (importType === 'CATEGORY_EDIT') {
        await this.processEditImport(jobId, fileUrl, fileName);
      } else {
        throw new Error(`Unknown importType: ${importType}`);
      }
      
      job.updateProgress(100);
      this.logger.log(`[category-import.completed] Job ${jobId} (${importType}) completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[category-import.error] Job ${jobId} error: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Process CREATE category import
   */
  private async processCreateImport(
    jobId: string,
    fileUrl: string,
    fileName?: string,
  ): Promise<void> {
    this.logger.log(`[category-create] Processing job ${jobId}, file: ${fileName || fileUrl}`);

    // Call API to process category CREATE import
    await this.callApi('/v1/import/worker/process-category-create', { jobId, fileUrl });
    
    this.logger.log(`[category-create] Job ${jobId} completed`);
  }

  /**
   * Process UPDATE category import
   */
  private async processUpdateImport(
    jobId: string,
    fileUrl: string,
    fileName?: string,
  ): Promise<void> {
    this.logger.log(`[category-update] Processing job ${jobId}, file: ${fileName || fileUrl}`);

    // Call API to process category UPDATE import
    await this.callApi('/v1/import/worker/process-category-update', { jobId, fileUrl });
    
    this.logger.log(`[category-update] Job ${jobId} completed`);
  }

  /**
   * Process EDIT category import
   */
  private async processEditImport(
    jobId: string,
    fileUrl: string,
    fileName?: string,
  ): Promise<void> {
    this.logger.log(`[category-edit] Processing job ${jobId}, file: ${fileName || fileUrl}`);

    // Call API to process category EDIT import
    await this.callApi('/v1/import/worker/process-category-edit', { jobId, fileUrl });
    
    this.logger.log(`[category-edit] Job ${jobId} completed`);
  }

  /**
   * Call API endpoint with job data
   * No internal retry — BullMQ handles retries with exponential backoff (3 attempts, 5s base)
   */
  private async callApi(endpoint: string, data: any): Promise<void> {
    const response = await axios.post(`${this.apiBaseUrl}${endpoint}`, data, {
      timeout: 300000, // 5 minute timeout for category imports
    });

    if (response.status >= 200 && response.status < 300) {
      this.logger.log(`API call to ${endpoint} succeeded (status ${response.status})`);
      return;
    }

    throw new Error(`API returned status ${response.status}`);
  }

  /**
   * Start worker
   */
  async start(): Promise<void> {
    await this.worker.waitUntilReady();
    this.logger.log('CategoryImportWorker started and ready');
  }

  /**
   * Stop worker
   */
  async stop(): Promise<void> {
    await this.worker.close();
    this.logger.log('CategoryImportWorker stopped');
  }
}

// Only auto-start if this file is run directly (not when imported via index.ts)
if (require.main === module) {
  const categoryImportWorker = new CategoryImportWorker();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down category import worker...');
    await categoryImportWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down category import worker...');
    await categoryImportWorker.stop();
    process.exit(0);
  });

  // Start worker
  categoryImportWorker.start().catch((error) => {
    console.error('Failed to start CategoryImportWorker:', error);
    process.exit(1);
  });
}

export { CategoryImportWorker };
