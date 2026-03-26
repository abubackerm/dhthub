import { Controller, Post, Body, Get, Logger, BadRequestException } from '@nestjs/common';
import { ZipExtractorService } from '../services/zip-extractor.service';
import { CatalogImportService } from '../services/catalog-import.service';
import { ImportJobService } from '../services/import-job.service';
import { ImageImportService, ImageUploadStrategy } from '../services/image-import.service';
import { CategoryImportService } from '../services/category-import.service';
import { ImportJobStatus } from '../entities/import-job-status.enum';
import * as fs from 'fs';
import * as path from 'path';
import unzipper from 'unzipper';

/**
 * ImportWorkerController - Internal API for BullMQ workers
 * 
 * This controller provides endpoints that are called by the catalog-import worker.
 * These endpoints are intentionally public (no auth) because they're called by
 * trusted worker processes within the same infrastructure.
 */
@Controller('import/worker')
export class ImportWorkerController {
  private readonly logger = new Logger(ImportWorkerController.name);

  constructor(
    private readonly zipExtractorService: ZipExtractorService,
    private readonly catalogImportService: CatalogImportService,
    private readonly importJobService: ImportJobService,
    private readonly imageImportService: ImageImportService,
    private readonly categoryImportService: CategoryImportService,
  ) {}

  /**
   * Worker API: Process catalog import (called by BullMQ worker)
   * POST /v1/import/worker/process-catalog
   */
  @Post('process-catalog')
  async processCatalog(@Body() body: { jobId: string; fileUrl: string }) {
    const { jobId, fileUrl } = body;

    this.logger.log(`[processCatalog] Received request: jobId=${jobId}, fileUrl="${fileUrl}"`);

    let actualFileUrl = fileUrl;
    if (!actualFileUrl) {
      this.logger.warn(`fileUrl not provided in request, retrieving from database for job ${jobId}`);
      const job = await this.importJobService.findById(jobId);
      actualFileUrl = job.fileUrl;
      this.logger.log(`[processCatalog] Retrieved fileUrl from database: "${actualFileUrl}"`);
    }

    if (!actualFileUrl) {
      throw new BadRequestException(`fileUrl is required. Received: ${JSON.stringify(body)}`);
    }

    const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
    const filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);

    this.logger.log(`[processCatalog] Resolved file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    let extractDir: string | undefined;

    try {
      const zipBuffer = fs.readFileSync(filePath);
      extractDir = path.join(process.cwd(), 'uploads', 'import', 'extracted', jobId);
      const extractedFiles = await this.zipExtractorService.extract(zipBuffer, extractDir);

      this.logger.log(`[processCatalog] Extracted files: ${JSON.stringify(extractedFiles)}`);

      await this.catalogImportService.processCatalogImport(jobId, extractedFiles);

      return { success: true, jobId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[processCatalog] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      if (extractDir) {
        await this.zipExtractorService.cleanup(extractDir).catch(() => {});
      }
    }
  }

  /**
   * Health check endpoint for workers
   * GET /v1/import/worker/health
   */
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Worker API: Process image import (called by BullMQ worker)
   * POST /v1/import/worker/process-images
   */
  @Post('process-images')
  async processImages(@Body() body: { jobId: string; fileUrl: string; strategy?: 'skip' | 'replace' }) {
    const { jobId, fileUrl, strategy } = body;

    this.logger.log(`[ImageImport] Received request: jobId=${jobId}, fileUrl="${fileUrl}", strategy="${strategy || 'replace'}"`);

    // CRITICAL: Check job status FIRST to prevent re-processing
    const job = await this.importJobService.findById(jobId);
    this.logger.log(`[ImageImport] Job ${jobId} current status: ${job.status}`);

    if (job.status !== ImportJobStatus.PENDING) {
      this.logger.log(`[ImageImport] Job ${jobId} already processed (status: ${job.status}), skipping`);
      return { success: true, jobId, processedCount: 0, skipped: true };
    }

    // Acquire lock to prevent concurrent processing
    const locked = await this.importJobService.acquireLock(jobId, `image-worker-${process.pid}`);
    if (!locked) {
      this.logger.log(`[ImageImport] Job ${jobId} is locked by another worker, skipping`);
      return { success: true, jobId, processedCount: 0, skipped: true };
    }

    this.logger.log(`[ImageImport] Lock acquired for job ${jobId}, starting processing`);

    let actualFileUrl = fileUrl;
    if (!actualFileUrl) {
      this.logger.warn(`fileUrl not provided in request, retrieving from database for job ${jobId}`);
      const job = await this.importJobService.findById(jobId);
      actualFileUrl = job.fileUrl;
      this.logger.log(`[processImages] Retrieved fileUrl from database: "${actualFileUrl}"`);
    }

    if (!actualFileUrl) {
      throw new BadRequestException(`fileUrl is required. Received: ${JSON.stringify(body)}`);
    }

    const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
    const filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);

    this.logger.log(`[processImages] Resolved file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    try {
      // Count total images in ZIP first
      const totalImages = await this.countImagesInZip(filePath);
      this.logger.log(`[processImages] Found ${totalImages} images in ZIP`);

      // Set total count and mark job as processing
      await this.importJobService.updateProgress(jobId, {
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
      });
      await this.importJobService.markAsProcessing(jobId, `image-worker-${process.pid}`);

      const uploadStrategy: ImageUploadStrategy = strategy === 'skip' ? ImageUploadStrategy.SKIP : ImageUploadStrategy.REPLACE;
      const result = await this.imageImportService.processImageZip(filePath, uploadStrategy);

      this.logger.log(`[processImages] Processed ${result.processed.length} images, skipped ${result.skipped.length} for job ${jobId}`);

      // Update job with actual counts
      await this.importJobService.updateProgress(jobId, {
        processedRows: result.processed.length,
        successRows: result.processed.length,
        failedRows: 0,
      });

      // Mark job as completed
      await this.importJobService.markAsCompleted(jobId);

    this.logger.log(`[ImageImport] Marking job ${jobId} as completed with ${result.processed.length} processed, ${result.skipped.length} skipped`);

    return { success: true, jobId, processedCount: result.processed.length, skippedCount: result.skipped.length, totalImages: result.total };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImport] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      await this.importJobService.markAsFailed(jobId);
      throw error;
    }
  }

  /**
   * Worker API: Process category CREATE import (called by BullMQ worker)
   * POST /v1/import/worker/process-category-create
   */
  @Post('process-category-create')
  async processCategoryCreate(@Body() body: { jobId: string; fileUrl: string }) {
    const { jobId, fileUrl } = body;

    this.logger.log(`[CategoryImport] Received CREATE request: jobId=${jobId}, fileUrl="${fileUrl}"`);

    let actualFileUrl = fileUrl;
    if (!actualFileUrl) {
      this.logger.warn(`fileUrl not provided in request, retrieving from database for job ${jobId}`);
      const job = await this.importJobService.findById(jobId);
      actualFileUrl = job.fileUrl;
      this.logger.log(`[CategoryImport] Retrieved fileUrl from database: "${actualFileUrl}"`);
    }

    if (!actualFileUrl) {
      throw new BadRequestException(`fileUrl is required. Received: ${JSON.stringify(body)}`);
    }

    const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
    const filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);

    this.logger.log(`[CategoryImport] Resolved file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    try {
      const result = await this.categoryImportService.processCreateImport(jobId, filePath);

      this.logger.log(
        `[CategoryImport] CREATE completed for job ${jobId}: ${result.categoriesCreated} categories, ${result.failedRows} errors`,
      );

      return {
        success: true,
        jobId,
        categoriesCreated: result.categoriesCreated,
        processedRows: result.processedRows,
        failedRows: result.failedRows,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CategoryImport] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Worker API: Process category UPDATE import (called by BullMQ worker)
   * POST /v1/import/worker/process-category-update
   */
  @Post('process-category-update')
  async processCategoryUpdate(@Body() body: { jobId: string; fileUrl: string }) {
    const { jobId, fileUrl } = body;

    this.logger.log(`[CategoryImport] Received UPDATE request: jobId=${jobId}, fileUrl="${fileUrl}"`);

    let actualFileUrl = fileUrl;
    if (!actualFileUrl) {
      this.logger.warn(`fileUrl not provided in request, retrieving from database for job ${jobId}`);
      const job = await this.importJobService.findById(jobId);
      actualFileUrl = job.fileUrl;
      this.logger.log(`[CategoryImport] Retrieved fileUrl from database: "${actualFileUrl}"`);
    }

    if (!actualFileUrl) {
      throw new BadRequestException(`fileUrl is required. Received: ${JSON.stringify(body)}`);
    }

    const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
    const filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);

    this.logger.log(`[CategoryImport] Resolved file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    try {
      const result = await this.categoryImportService.processUpdateImport(jobId, filePath);

      this.logger.log(
        `[CategoryImport] UPDATE completed for job ${jobId}: ${result.categoriesCreated} categories, ${result.cellsCreated} cells, ${result.failedRows} errors`,
      );

      return {
        success: true,
        jobId,
        categoriesCreated: result.categoriesCreated,
        cellsCreated: result.cellsCreated,
        processedRows: result.processedRows,
        failedRows: result.failedRows,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CategoryImport] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Count total image files in ZIP without processing them
   */
  private async countImagesInZip(zipPath: string): Promise<number> {
    const directory = await unzipper.Open.file(zipPath);
    let count = 0;

    for (const file of directory.files) {
      if (this.isValidImageFile(file.path)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if file is a valid image
   */
  private isValidImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
  }
}
