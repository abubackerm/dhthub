import { Controller, Post, Body, Get, Logger, BadRequestException } from '@nestjs/common';
import { ZipExtractorService } from '../services/zip-extractor.service';
import { ExtractedFiles } from '../dto/extracted-files.dto';
import { CatalogImportService } from '../services/catalog-import.service';
import { SimpleProductImportService } from '../services/simple-product-import.service';
import { ImportJobService } from '../services/import-job.service';
import { ImageImportService, ImageUploadStrategy } from '../services/image-import.service';
import { CategoryImportService } from '../services/category-import.service';
import { ImportJobStatus } from '../entities/import-job-status.enum';
import { ImportType } from '../entities';
import { StorageService } from '@modules/storage/storage.service';
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
    private readonly simpleProductImportService: SimpleProductImportService,
    private readonly importJobService: ImportJobService,
    private readonly imageImportService: ImageImportService,
    private readonly categoryImportService: CategoryImportService,
    private readonly storageService: StorageService,
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

    let filePath: string;
    let isTempFile = false;

    if (this.isSeaweedFSUrl(actualFileUrl)) {
      filePath = await this.downloadFromSeaweedFS(actualFileUrl);
      isTempFile = true;
      this.logger.log(`[processCatalog] Downloaded file from SeaweedFS to temp: ${filePath}`);
    } else {
      const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
      filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);
      this.logger.log(`[processCatalog] Resolved file path: ${filePath}`);
    }

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    let extractedFiles: ExtractedFiles | undefined;

    try {
      // Validate ZIP file before processing
      this.logger.log(`[processCatalog] Validating ZIP file for job ${jobId}`);
      this.logger.log(`[processCatalog] ZIP file path: ${filePath}`);
      await this.validateZipFile(filePath, 'catalog', false);
      this.logger.log(`[processCatalog] ZIP validation passed for job ${jobId}`);

      const zipBuffer = fs.readFileSync(filePath);
      extractedFiles = await this.zipExtractorService.extract(zipBuffer, ImportType.CATALOG);

      this.logger.log(`[processCatalog] Extracted files: ${JSON.stringify(extractedFiles)}`);

      await this.catalogImportService.processCatalogImport(jobId, extractedFiles);

      return { success: true, jobId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[processCatalog] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      if (extractedFiles) {
        await this.zipExtractorService.cleanup(extractedFiles).catch(() => {});
      }
      if (isTempFile) {
        await this.cleanupTempFile(filePath);
      }
    }
  }

  /**
   * Worker API: Process simple product import (called by BullMQ worker)
   * POST /v1/import/worker/process-simple-products
   */
  @Post('process-simple-products')
  async processSimpleProducts(@Body() body: { jobId: string; fileUrl: string }) {
    const { jobId, fileUrl } = body;

    this.logger.log(`[SimpleProductImport] Received request: jobId=${jobId}, fileUrl="${fileUrl}"`);

    let actualFileUrl = fileUrl;
    if (!actualFileUrl) {
      this.logger.warn(`fileUrl not provided, retrieving from database for job ${jobId}`);
      const job = await this.importJobService.findById(jobId);
      actualFileUrl = job.fileUrl;
      this.logger.log(`[SimpleProductImport] Retrieved fileUrl from database: "${actualFileUrl}"`);
    }

    if (!actualFileUrl) {
      throw new BadRequestException(`fileUrl is required. Received: ${JSON.stringify(body)}`);
    }

    let filePath: string;
    let isTempFile = false;

    if (this.isSeaweedFSUrl(actualFileUrl)) {
      filePath = await this.downloadFromSeaweedFS(actualFileUrl);
      isTempFile = true;
      this.logger.log(`[SimpleProductImport] Downloaded file from SeaweedFS to temp: ${filePath}`);
    } else {
      const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
      filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);
      this.logger.log(`[SimpleProductImport] Resolved file path: ${filePath}`);
    }

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    let extractedFiles: ExtractedFiles | undefined;

    try {
      let csvPath = filePath;

      if (filePath.endsWith('.zip')) {
        this.logger.log(`[SimpleProductImport] Extracting ZIP for job ${jobId}`);
        const zipBuffer = fs.readFileSync(filePath);
        extractedFiles = await this.zipExtractorService.extract(zipBuffer, ImportType.SIMPLE_PRODUCTS);

        this.logger.log(`[SimpleProductImport] Extracted files: ${JSON.stringify(extractedFiles)}`);

        const productsUrl = extractedFiles.products;
        if (!productsUrl) {
          throw new BadRequestException(
            'No product CSV found in ZIP. Expected simple-products.csv or products.csv.',
          );
        }
        csvPath = productsUrl;
      } else {
        this.logger.log(`[SimpleProductImport] Processing plain CSV file for job ${jobId}: ${filePath}`);
      }

      await this.simpleProductImportService.processSimpleProductImport(jobId, csvPath);

      return { success: true, jobId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[SimpleProductImport] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      if (extractedFiles) {
        await this.zipExtractorService.cleanup(extractedFiles).catch(() => {});
      }
      if (isTempFile) {
        await this.cleanupTempFile(filePath);
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
   * Uses pure streaming - no temp files written to disk
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
      actualFileUrl = job.fileUrl;
      this.logger.log(`[processImages] Retrieved fileUrl from database: "${actualFileUrl}"`);
    }

    if (!actualFileUrl) {
      throw new BadRequestException(`fileUrl is required. Received: ${JSON.stringify(body)}`);
    }

    // Extract storage key from URL (handle URL-encoded paths)
    // URL format: http://localhost:8333/catalog/imports/...
    // Storage key: imports/... (without /catalog prefix, no leading slash)
    const urlParts = new URL(actualFileUrl);
    const storageKey = decodeURIComponent(urlParts.pathname).replace(/^\/[^/]+\//, '');
    
    this.logger.log(`[ImageImport] Extracted storage key: ${storageKey}`);

    try {
      // Get stream from SeaweedFS
      this.logger.log(`[ImageImport] Getting stream from SeaweedFS for key: ${storageKey}`);
      const zipStream = await this.storageService.getFileStream(storageKey);
      this.logger.log(`[ImageImport] Successfully obtained stream from SeaweedFS`);

      // Set initial progress and mark job as processing
      await this.importJobService.updateProgress(jobId, {
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
      });
      await this.importJobService.markAsProcessing(jobId, `image-worker-${process.pid}`);

      const uploadStrategy: ImageUploadStrategy = strategy === 'skip' ? ImageUploadStrategy.SKIP : ImageUploadStrategy.REPLACE;
      this.logger.log(`[processImages] Starting image processing with strategy: ${uploadStrategy}`);
      this.logger.log(`[processImages] Calling imageImportService.processImageZip with stream`);

      // Pass stream to service for processing
      const result = await this.imageImportService.processImageZip(zipStream, uploadStrategy);

      this.logger.log(`[processImages] ImageImportService returned results:`);
      this.logger.log(`[processImages]   - Processed: ${result.processed.length} images`);
      this.logger.log(`[processImages]   - Skipped: ${result.skipped.length} images`);
      this.logger.log(`[processImages]   - Total: ${result.total} images`);

      if (result.processed.length > 0) {
        this.logger.log(`[processImages]   - First few processed SKUs: ${result.processed.slice(0, 5).map(p => p.sku).join(', ')}`);
      }
      if (result.skipped.length > 0) {
        this.logger.log(`[processImages]   - First few skipped SKUs: ${result.skipped.slice(0, 5).map(s => s.sku).join(', ')}`);
      }

      this.logger.log(`[processImages] Processed ${result.processed.length} images, skipped ${result.skipped.length} for job ${jobId}`);

      // Final safety check
      if (result.processed.length === 0) {
        this.logger.error('[ImageImport] NO IMAGES PROCESSED');
        throw new BadRequestException('No images found in ZIP');
      }

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
      
      // Check for NoSuchKey error (permanent 404 - no retry)
      const isNoSuchKey = error && typeof error === 'object' && 'Code' in error && (error as any).Code === 'NoSuchKey';
      if (isNoSuchKey) {
        this.logger.error(`[ImageImport] ZIP file not found in storage: ${storageKey}`);
        await this.importJobService.markAsFailed(jobId);
        throw new BadRequestException(`ZIP file not found in storage: ${storageKey}`);
      }
      
      this.logger.error(`[ImageImport] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      await this.importJobService.markAsFailed(jobId);
      throw error;
    }
    // No finally block - no temp files to clean up with streaming
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

    let filePath: string;
    let isTempFile = false;

    if (this.isSeaweedFSUrl(actualFileUrl)) {
      filePath = await this.downloadFromSeaweedFS(actualFileUrl);
      isTempFile = true;
      this.logger.log(`[CategoryImport] Downloaded file from SeaweedFS to temp: ${filePath}`);
    } else {
      const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
      filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);
      this.logger.log(`[CategoryImport] Resolved file path: ${filePath}`);
    }

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    try {
      // Validate ZIP file before processing (skip for plain CSV files)
      if (filePath.endsWith('.zip')) {
        this.logger.log(`[CategoryImport] Validating ZIP file for CREATE job ${jobId}`);
        this.logger.log(`[CategoryImport] ZIP file path: ${filePath}`);
        await this.validateZipFile(filePath, 'category-create', false);
        this.logger.log(`[CategoryImport] ZIP validation passed for CREATE job ${jobId}`);
      } else {
        this.logger.log(`[CategoryImport] Skipping ZIP validation for CREATE job ${jobId} (CSV file detected)`);
      }

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
    } finally {
      if (isTempFile) {
        await this.cleanupTempFile(filePath);
      }
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

    let filePath: string;
    let isTempFile = false;

    if (this.isSeaweedFSUrl(actualFileUrl)) {
      filePath = await this.downloadFromSeaweedFS(actualFileUrl);
      isTempFile = true;
      this.logger.log(`[CategoryImport] Downloaded file from SeaweedFS to temp: ${filePath}`);
    } else {
      const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
      filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);
      this.logger.log(`[CategoryImport] Resolved file path: ${filePath}`);
    }

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    try {
      // Validate ZIP file before processing (skip for plain CSV files)
      if (filePath.endsWith('.zip')) {
        this.logger.log(`[CategoryImport] Validating ZIP file for UPDATE job ${jobId}`);
        this.logger.log(`[CategoryImport] ZIP file path: ${filePath}`);
        await this.validateZipFile(filePath, 'category-update', false);
        this.logger.log(`[CategoryImport] ZIP validation passed for UPDATE job ${jobId}`);
      } else {
        this.logger.log(`[CategoryImport] Skipping ZIP validation for UPDATE job ${jobId} (CSV file detected)`);
      }

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
    } finally {
      if (isTempFile) {
        await this.cleanupTempFile(filePath);
      }
    }
  }

  /**
   * Worker API: Process category EDIT import (called by BullMQ worker)
   * POST /v1/import/worker/process-category-edit
   */
  @Post('process-category-edit')
  async processCategoryEdit(@Body() body: { jobId: string; fileUrl: string }) {
    const { jobId, fileUrl } = body;

    this.logger.log(`[CategoryImport] Received EDIT request: jobId=${jobId}, fileUrl="${fileUrl}"`);

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

    let filePath: string;
    let isTempFile = false;

    if (this.isSeaweedFSUrl(actualFileUrl)) {
      filePath = await this.downloadFromSeaweedFS(actualFileUrl);
      isTempFile = true;
      this.logger.log(`[CategoryImport] Downloaded file from SeaweedFS to temp: ${filePath}`);
    } else {
      const relativePath = actualFileUrl.replace(/^\/uploads\/import\//, '');
      filePath = path.join(process.cwd(), 'uploads', 'import', relativePath);
      this.logger.log(`[CategoryImport] Resolved file path: ${filePath}`);
    }

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath} (from fileUrl: ${actualFileUrl})`);
    }

    try {
      // Validate ZIP file before processing (skip for plain CSV files)
      if (filePath.endsWith('.zip')) {
        this.logger.log(`[CategoryImport] Validating ZIP file for EDIT job ${jobId}`);
        this.logger.log(`[CategoryImport] ZIP file path: ${filePath}`);
        await this.validateZipFile(filePath, 'category-edit', false);
        this.logger.log(`[CategoryImport] ZIP validation passed for EDIT job ${jobId}`);
      } else {
        this.logger.log(`[CategoryImport] Skipping ZIP validation for EDIT job ${jobId} (CSV file detected)`);
      }

      const result = await this.categoryImportService.processEditImport(jobId, filePath);

      this.logger.log(
        `[CategoryImport] EDIT completed for job ${jobId}: ${result.categoriesUpdated} categories updated, ${result.failedRows} errors`,
      );

      return {
        success: true,
        jobId,
        categoriesUpdated: result.categoriesUpdated,
        processedRows: result.processedRows,
        failedRows: result.failedRows,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CategoryImport] Job ${jobId} failed: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      if (isTempFile) {
        await this.cleanupTempFile(filePath);
      }
    }
  }

  /**
   * Worker API: Mark an import job as FAILED (called by BullMQ workers on exhaustion)
   * POST /v1/import/worker/mark-failed
   */
  @Post('mark-failed')
  async markJobFailed(@Body() body: { jobId: string; errorMessage?: string }) {
    const { jobId, errorMessage } = body;

    this.logger.error(`[mark-failed] Marking job ${jobId} as FAILED${errorMessage ? `: ${errorMessage}` : ''}`);

    try {
      await this.importJobService.markAsFailed(jobId);
      return { success: true, jobId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[mark-failed] Failed to mark job ${jobId}: ${msg}`);
      throw error;
    }
  }

  /**
   * Validate ZIP file before processing
   * Checks: file exists, valid ZIP structure, contains images (optional)
   * @param zipPath Path to ZIP file
   * @param importType Type of import (for logging)
   * @param requireImages Whether ZIP must contain images (default: true)
   */
  private async validateZipFile(zipPath: string, importType: string, requireImages: boolean = true): Promise<void> {
    this.logger.log(`[DEBUG] Validating ZIP: ${zipPath}`);
    let debugDirectory: any;
    try {
      debugDirectory = await unzipper.Open.file(zipPath);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorStr = `Invalid ZIP file structure: ${errorMsg}`;
      this.logger.error(`[DEBUG] ${errorStr}`);
      throw new BadRequestException(errorStr);
    }
    this.logger.log(`[DEBUG] ZIP TOTAL ENTRIES: ${debugDirectory.files.length}`);
    for (const file of debugDirectory.files) {
      this.logger.log(`[DEBUG] ZIP ENTRY: ${file.path}`);
    }

    this.logger.log(`[validateZipFile] Starting validation for ${importType} import: ${zipPath}`);
    this.logger.log(`[validateZipFile] Require images: ${requireImages}`);

    // 1. Check file exists
    if (!fs.existsSync(zipPath)) {
      const error = `ZIP file not found: ${zipPath}`;
      this.logger.error(`[validateZipFile] ${error}`);
      throw new BadRequestException(error);
    }

    // 2. Check file size
    const stats = fs.statSync(zipPath);
    const fileSizeBytes = stats.size;
    const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);

    if (fileSizeBytes === 0) {
      const error = `ZIP file is empty (0 bytes): ${zipPath}`;
      this.logger.error(`[validateZipFile] ${error}`);
      throw new BadRequestException(error);
    }

    this.logger.log(`[validateZipFile] File exists and has size: ${fileSizeBytes} bytes (${fileSizeKB} KB)`);

    // 3. Validate ZIP structure (already opened above as debugDirectory)
    this.logger.log(`[validateZipFile] ZIP structure is valid. Total entries: ${debugDirectory.files.length}`);

    // 4. Check if ZIP contains files
    const fileEntries = debugDirectory.files.filter((f: any) => f.type !== 'Directory');
    if (fileEntries.length === 0) {
      const error = `ZIP file contains no files (only directories or empty)`;
      this.logger.error(`[validateZipFile] ${error}`);
      throw new BadRequestException(error);
    }

    // 5. Check if ZIP contains images (if required)
    let imageCount = 0;
    const imageFiles: string[] = [];
    const nonImageFiles: string[] = [];

    for (const file of debugDirectory.files) {
      if (file.type === 'Directory') continue;

      const fileName = file.path;
      const isImage = this.isValidImageFile(fileName);

      if (isImage) {
        imageCount++;
        imageFiles.push(fileName);
      } else {
        nonImageFiles.push(fileName);
      }
    }

    this.logger.log(`[validateZipFile] ZIP content analysis:`);
    this.logger.log(`[validateZipFile]   - Total files: ${fileEntries.length}`);
    this.logger.log(`[validateZipFile]   - Image files: ${imageCount}`);
    this.logger.log(`[validateZipFile]   - Non-image files: ${nonImageFiles.length}`);

    if (requireImages && imageCount === 0) {
      const error = `ZIP file contains no valid image files. Found ${nonImageFiles.length} non-image files: ${nonImageFiles.slice(0, 5).join(', ') || 'none'}`;
      this.logger.error(`[validateZipFile] ${error}`);
      throw new BadRequestException(error);
    }

    // 6. Log sample files
    if (imageFiles.length > 0) {
      const sampleCount = Math.min(10, imageFiles.length);
      this.logger.log(`[validateZipFile] Sample image files (${sampleCount} of ${imageFiles}):`);
      for (let i = 0; i < sampleCount; i++) {
        const fileName = imageFiles[i];
        const basename = path.basename(fileName);
        const inSubfolder = fileName.includes('/');
        this.logger.log(`[validateZipFile]   [${i + 1}] "${basename}" ${inSubfolder ? '(in subfolder)' : '(root)'}`);
      }
      if (imageFiles.length > sampleCount) {
        this.logger.log(`[validateZipFile]   ... and ${imageFiles.length - sampleCount} more`);
      }
    } else if (nonImageFiles.length > 0) {
      const sampleCount = Math.min(5, nonImageFiles.length);
      this.logger.log(`[validateZipFile] Sample non-image files (${sampleCount} of ${nonImageFiles.length}): ${nonImageFiles.slice(0, sampleCount).join(', ')}`);
    }

    this.logger.log(`[validateZipFile] Validation passed for ${importType} import: ${zipPath}`);
  }

  /**
   * Check if file is a valid image
   */
  private isValidImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const isValid = validExtensions.includes(ext);
    
    if (isValid) {
      this.logger.debug(`[isValidImageFile] Valid image: "${filePath}" (extension: "${ext}")`);
    } else {
      this.logger.debug(`[isValidImageFile] Invalid image: "${filePath}" (extension: "${ext}")`);
    }
    
    return isValid;
  }

  /**
   * Check if the given fileUrl is a SeaweedFS URL
   */
  private isSeaweedFSUrl(fileUrl: string): boolean {
    return fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
  }

  /**
   * Download a file from SeaweedFS URL to local temp storage
   * Implements retry logic with exponential backoff and file integrity checks
   */
  private async downloadFromSeaweedFS(fileUrl: string): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const urlParts = new URL(fileUrl);
        // Extract storage key by removing bucket name from pathname
        // URL format: http://localhost:8333/catalog/imports/...
        // Storage key: imports/... (without /catalog prefix, no leading slash)
        const bucketName = 'catalog';
        let storageKey = decodeURIComponent(urlParts.pathname);
        if (storageKey.startsWith(`/${bucketName}/`)) {
          storageKey = storageKey.substring(bucketName.length + 2); // Remove '/catalog/'
        } else if (storageKey.startsWith(`/${bucketName}`)) {
          storageKey = storageKey.substring(bucketName.length + 1); // Remove '/catalog'
        }
        // Ensure no leading slash
        storageKey = storageKey.replace(/^\//, '');

        this.logger.log(`[downloadFromSeaweedFS] Attempt ${attempt}/${maxRetries}: Downloading from SeaweedFS`);
        this.logger.log(`[downloadFromSeaweedFS] Original pathname: ${urlParts.pathname}`);
        this.logger.log(`[downloadFromSeaweedFS] Storage key (stripped): ${storageKey}`);
        this.logger.log(`[downloadFromSeaweedFS] Full URL: ${fileUrl}`);

        const buffer = await this.storageService.getFile(storageKey);

        const fileSize = buffer.length;
        const fileSizeKB = (fileSize / 1024).toFixed(2);
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        this.logger.log(`[downloadFromSeaweedFS] Downloaded buffer size: ${fileSize} bytes (${fileSizeKB} KB, ${fileSizeMB} MB)`);

        const tempDir = path.join(process.cwd(), 'uploads', 'import', 'temp');
        await fs.promises.mkdir(tempDir, { recursive: true });

        const tempFilePath = path.join(tempDir, `${Date.now()}-${path.basename(storageKey)}`);
        await fs.promises.writeFile(tempFilePath, buffer);

        this.logger.log(`[downloadFromSeaweedFS] File written to temp: ${tempFilePath}`);

        // ZIP integrity check: only validate ZIP structure for .zip files
        if (tempFilePath.endsWith('.zip')) {
          try {
            this.logger.log(`[downloadFromSeaweedFS] Validating ZIP structure...`);
            await unzipper.Open.file(tempFilePath);
            this.logger.log(`[downloadFromSeaweedFS] ZIP structure is valid`);
          } catch (zipError) {
            const errorMsg = zipError instanceof Error ? zipError.message : String(zipError);
            const error = `ZIP file is corrupted or incomplete: ${errorMsg}`;
            this.logger.error(`[downloadFromSeaweedFS] ${error}`);
            throw new Error(error);
          }
        }

        // Verify file was written correctly
        const stats = fs.statSync(tempFilePath);
        this.logger.log(`[downloadFromSeaweedFS] File size on disk: ${stats.size} bytes`);

        if (stats.size !== fileSize) {
          this.logger.warn(`[downloadFromSeaweedFS] File size mismatch! Buffer: ${fileSize} bytes, Disk: ${stats.size} bytes`);
        }

        return tempFilePath;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[downloadFromSeaweedFS] Attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);

        if (attempt === maxRetries) {
          this.logger.error(`[downloadFromSeaweedFS] All ${maxRetries} attempts failed. Final error: ${errorMsg}`);
          if (error instanceof Error && error.stack) {
            this.logger.error(`[downloadFromSeaweedFS] Stack trace: ${error.stack}`);
          }
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.log(`[downloadFromSeaweedFS] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    // This line should never be reached due to logic above
    throw new Error('downloadFromSeaweedFS: Unexpected code path reached');
  }

  /**
   * Clean up a temp file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.debug(`[cleanupTempFile] Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`[cleanupTempFile] Failed to clean up temp file ${filePath}: ${error}`);
    }
  }
}
