import { Controller, Post, Body, Get, Logger, BadRequestException } from '@nestjs/common';
import { ZipExtractorService } from '../services/zip-extractor.service';
import { CatalogImportService } from '../services/catalog-import.service';
import { ImportJobService } from '../services/import-job.service';
import * as fs from 'fs';
import * as path from 'path';

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
}
