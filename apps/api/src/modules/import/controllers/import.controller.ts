import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ImportService, UploadedFile } from '../services/import.service';
import { ImportJobService } from '../services/import-job.service';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { ImportStatusView, ImportErrorView, ImportJobWithErrorsView } from '../dto/views';
import { ImportJobStatus, ImportMode } from '../entities';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('import')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
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
  async createJob(
    @Req() req: FastifyRequest,
    @Query('validateOnly') validateOnly?: string,
  ) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException(
        'No file provided. Send a multipart/form-data request with a "file" field.',
      );
    }

    const buffer = await data.toBuffer();
    const file: UploadedFile = {
      fieldname: data.fieldname,
      filename: data.filename,
      encoding: data.encoding,
      mimetype: data.mimetype,
      buffer,
      size: buffer.length,
      originalname: data.filename,
    };

    const fields = data.fields as Record<string, any>;
    const createdBy = fields?.createdBy?.value as string | undefined;
    const mode = fields?.mode?.value as ImportMode | undefined;
    const warehouseId = fields?.warehouseId?.value as string | undefined;

    if (validateOnly === 'true') {
      const result = await this.importService.validateOnly(file, { createdBy });
      return {
        isValid: result.isValid,
        totalRows: result.totalRows,
        totalErrors: result.totalErrors,
        totalWarnings: result.totalWarnings,
        errors: result.errors,
      };
    }

    const result = await this.importService.uploadCsv(file, {
      createdBy,
      mode,
      warehouseId,
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
   * Download validation errors for a job as CSV
   * GET /v1/import/jobs/:id/errors/download
   */
  @Get('jobs/:id/errors/download')
  async downloadJobErrors(
    @Param('id') id: string,
  ): Promise<{
    filename: string;
    contentType: string;
    content: string;
  }> {
    const job = await this.importJobService.findById(id);
    const errors = await this.importErrorRepository.findByJobId(id);

    const filename = `${job.fileName ?? 'import'}-errors.csv`;

    const header = ['rowNumber', 'sku', 'error'];
    const escape = (value: string | number | null): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = errors.map((error) => [
      escape(error.rowNumber),
      escape(error.sku),
      escape(error.message),
    ]);

    const content = [
      header.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    return {
      filename,
      contentType: 'text/csv',
      content,
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
  async getTemplate(@Query('categoryId') categoryId?: string) {
    const templateInfo = await this.importService.getTemplateInfo(categoryId);
    const templateContent = await this.importService.getTemplate(categoryId);

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
  async downloadTemplate(@Query('categoryId') categoryId?: string) {
    const templateContent = await this.importService.getTemplate(categoryId);
    const templateInfo = await this.importService.getTemplateInfo(categoryId);

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
