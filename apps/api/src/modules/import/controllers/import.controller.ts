import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ImportService, UploadedFile } from '../services/import.service';
import { ImportJobService } from '../services/import-job.service';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { CreateImportJobDto } from '../dto/create-import-job.dto';
import { ImportStatusView, ImportErrorView, ImportJobWithErrorsView } from '../dto/views';
import { ImportJobStatus } from '../entities';

@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly importJobService: ImportJobService,
    private readonly importErrorRepository: ImportErrorRepository,
  ) {}

  /**
   * Upload CSV file and create import job
   * POST /v1/import/jobs
   */
  @Post('jobs')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createJob(
    @Body() file: UploadedFile,
    @Body() dto?: CreateImportJobDto,
    @Query('validateOnly') validateOnly?: string,
  ) {
    if (validateOnly === 'true') {
      const result = await this.importService.validateOnly(file, {
        createdBy: dto?.createdBy,
      });
      return {
        isValid: result.isValid,
        totalRows: result.totalRows,
        totalErrors: result.totalErrors,
        totalWarnings: result.totalWarnings,
        errors: result.errors,
      };
    }

    const result = await this.importService.uploadCsv(file, {
      createdBy: dto?.createdBy,
    });

    return {
      jobId: result.jobId,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileSize: result.fileSize,
      totalRows: result.totalRows,
    };
  }

  /**
   * List all import jobs with pagination
   * GET /v1/import/jobs
   */
  @Get('jobs')
  async listJobs(
    @Query('status') status?: ImportJobStatus,
    @Query('createdBy') createdBy?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const { jobs, total } = await this.importJobService.findAll({
      status,
      createdBy,
      limit,
      offset,
    });

    const views = jobs.map(this.jobToView);

    return {
      data: views,
      pagination: {
        total,
        limit: limit ?? jobs.length,
        offset: offset ?? 0,
      },
    };
  }

  /**
   * Get import job status with metrics
   * GET /v1/import/jobs/:id
   */
  @Get('jobs/:id')
  async getJob(@Param('id') id: string): Promise<ImportStatusView> {
    const job = await this.importJobService.findById(id);
    const metrics = await this.importJobService.getMetrics(id);

    return {
      ...this.jobToView(job),
      duration: metrics.duration,
      rowsPerSecond: metrics.rowsPerSecond,
    };
  }

  /**
   * Get validation errors for a job
   * GET /v1/import/jobs/:id/errors
   */
  @Get('jobs/:id/errors')
  async getJobErrors(
    @Param('id') id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<ImportJobWithErrorsView> {
    const job = await this.importJobService.findById(id);
    const metrics = await this.importJobService.getMetrics(id);

    const { errors, total } = await this.importErrorRepository.findByJobIdPaginated(id, {
      limit: limit ?? 100,
      offset: offset ?? 0,
    });

    return {
      ...this.jobToView(job),
      duration: metrics.duration,
      rowsPerSecond: metrics.rowsPerSecond,
      errors: errors.map(this.errorToView),
      errorCount: total,
    };
  }

  /**
   * Cancel an import job
   * DELETE /v1/import/jobs/:id
   */
  @Delete('jobs/:id')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param('id') id: string): Promise<ImportStatusView> {
    const job = await this.importJobService.cancel(id);
    return this.jobToView(job);
  }

  /**
   * Download CSV template
   * GET /v1/import/template
   */
  @Get('template')
  async getTemplate() {
    const templateInfo = this.importService.getTemplateInfo();
    const templateContent = this.importService.getTemplate();

    return {
      filename: templateInfo.filename,
      headers: templateInfo.headers,
      description: templateInfo.description,
      content: templateContent,
    };
  }

  /**
   * Download CSV template as file
   * GET /v1/import/template/download
   */
  @Get('template/download')
  async downloadTemplate() {
    const templateContent = this.importService.getTemplate();
    const templateInfo = this.importService.getTemplateInfo();

    return {
      filename: templateInfo.filename,
      contentType: 'text/csv',
      content: templateContent,
    };
  }

  /**
   * Convert ImportJob entity to ImportStatusView
   */
  private jobToView(job: any): ImportStatusView {
    return {
      id: job.id,
      fileUrl: job.fileUrl,
      fileName: job.fileName,
      fileSize: job.fileSize,
      type: job.type,
      status: job.status,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      lastProcessedRow: job.lastProcessedRow,
      lockedAt: job.lockedAt,
      lockedBy: job.lockedBy,
      createdBy: job.createdBy,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      duration: null,
      rowsPerSecond: null,
    };
  }

  /**
   * Convert ImportError entity to ImportErrorView
   */
  private errorToView(error: any): ImportErrorView {
    return {
      id: error.id,
      jobId: error.jobId,
      rowNumber: error.rowNumber,
      sku: error.sku,
      message: error.message,
      createdAt: error.createdAt,
    };
  }
}
