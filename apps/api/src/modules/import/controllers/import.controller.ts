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
import { Readable } from 'stream';
import { ImportService, UploadedFile } from '../services/import.service';
import { ImportJobService } from '../services/import-job.service';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { ImportStatusView, ImportErrorView, ImportJobWithErrorsView } from '../dto/views';
import { ImportJobStatus, ImportMode, ImportType } from '../entities';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { TemplatePackService } from '../services/template-pack.service';
import { CsvParserService } from '../services/csv-parser.service';

@Controller('import')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly importJobService: ImportJobService,
    private readonly importErrorRepository: ImportErrorRepository,
    private readonly templatePackService: TemplatePackService,
    private readonly csvParserService: CsvParserService,
  ) {}

  /**
   * Upload CSV or ZIP file and create import job
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
    const importType = fields?.importType?.value as ImportType | undefined;

    if (validateOnly === 'true') {
      // Validate-only mode only supports CSV for now
      if (!file.filename.endsWith('.csv')) {
        throw new BadRequestException('Validate only mode only supports CSV files');
      }
      
      // Skip product validation for category imports - just check CSV is readable
      if (importType?.startsWith('CATEGORY_')) {
        try {
          const fileStream = Readable.from(file.buffer);
          const headers = await this.csvParserService.getHeaders(fileStream);
          return {
            isValid: headers.length > 0,
            totalRows: 0,
            totalErrors: headers.length === 0 ? 1 : 0,
            totalWarnings: 0,
            errors: headers.length === 0 ? [{
              rowNumber: 0,
              field: 'headers',
              message: 'CSV file has no headers',
              severity: 'error',
            }] : [],
          };
        } catch (error) {
          return {
            isValid: false,
            totalRows: 0,
            totalErrors: 1,
            totalWarnings: 0,
            errors: [{
              rowNumber: 0,
              field: 'file',
              message: error instanceof Error ? error.message : String(error),
              severity: 'error',
            }],
          };
        }
      }
      
      const result = await this.importService.validateOnly(file, { createdBy });
      return {
        isValid: result.isValid,
        totalRows: result.totalRows,
        totalErrors: result.totalErrors,
        totalWarnings: result.totalWarnings,
        errors: result.errors,
      };
    }

    // Route to appropriate upload method based on file type
    const isZip = file.filename.endsWith('.zip');
    const result = isZip
      ? await this.importService.uploadZip(file, { createdBy, mode, warehouseId, importType: importType ?? ImportType.CATALOG })
      : await this.importService.uploadCsv(file, { createdBy, mode, warehouseId, importType });

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

    const header = ['rowNumber', 'name', 'sku', 'error'];
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

    const extractName = (rawData: Record<string, unknown> | null): string => {
      if (!rawData) return '';
      if (typeof rawData.name === 'string' && rawData.name.trim()) return rawData.name.trim();
      for (let i = 6; i >= 0; i--) {
        const key = i === 0 ? 'main_branch' : `branch${i}`;
        const value = rawData[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
      return '';
    };

    const rows = errors.map((error) => [
      escape(error.rowNumber),
      escape(extractName(error.rawData as Record<string, unknown> | null)),
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
  async getTemplate(
    @Query('cellId') cellId?: string,
    @Query('mode') mode?: 'create' | 'edit',
    @Query('importType') importType?: string,
  ) {
    const templateInfo = await this.importService.getTemplateInfo(cellId, mode, importType);
    const templateContent = await this.importService.getTemplate(cellId, mode, importType);

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
  async downloadTemplate(
    @Query('cellId') cellId?: string,
    @Query('mode') mode?: 'create' | 'edit',
    @Query('importType') importType?: string,
  ) {
    const templateContent = await this.importService.getTemplate(cellId, mode, importType);
    const templateInfo = await this.importService.getTemplateInfo(cellId, mode, importType);

    return {
      filename: templateInfo.filename,
      contentType: 'text/csv',
      content: templateContent,
    };
  }

  /**
   * Download template pack (ZIP with all CSV templates + README)
   * GET /v1/import/template-pack
   */
  @Get('template-pack')
  async getTemplatePack() {
    const zipBuffer = await this.templatePackService.generateTemplatePack();

    return {
      filename: 'catalog-import-templates.zip',
      contentType: 'application/zip',
      content: zipBuffer.toString('base64'),
    };
  }

  /**
   * Download variants template (CSV only)
   * GET /v1/import/variants-template
   */
  @Get('variants-template')
  async getVariantsTemplate() {
    const variantsTemplate = this.templatePackService.generateVariantsTemplate();
    const headers = [
      { name: 'product_sku', required: true, description: 'Product SKU to create variants for' },
      { name: 'stock', required: false, description: 'Inventory quantity (integer, defaults to 0)' },
      { name: 'price', required: false, description: 'Unit price in dollars (decimal, defaults to 0)' },
      { name: 'diameter', required: false, description: 'Diameter attribute value' },
      { name: 'length', required: false, description: 'Length attribute value' },
      { name: 'material', required: false, description: 'Material attribute value' },
      { name: 'finish', required: false, description: 'Finish attribute value' },
    ];

    return {
      filename: 'variants_template.csv',
      headers,
      description: 'Template for product variants with attribute values. Each row creates a variant for the specified product.',
      content: variantsTemplate,
    };
  }

  /**
   * Upload image ZIP file and create import job
   * POST /v1/import/images
   */
  @Post('images')
  async uploadImages(@Req() req: FastifyRequest) {
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

    // Validate it's a ZIP file
    if (!file.filename.endsWith('.zip')) {
      throw new BadRequestException('Only ZIP files are supported for image uploads');
    }

    const fields = data.fields as Record<string, any>;
    const createdBy = fields?.createdBy?.value as string | undefined;
    const strategy = fields?.strategy?.value as 'skip' | 'replace' | undefined;

    const result = await this.importService.uploadZip(file, {
      createdBy,
      mode: ImportMode.UPSERT,
      importType: ImportType.IMAGES,
      strategy: strategy || 'replace',
    });

    return {
      jobId: result.jobId,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      fileSize: result.fileSize,
    };
  }

  /**
   * Get image import job status
   * GET /v1/import/images/:jobId/status
   */
  @Get('images/:jobId/status')
  async getImageImportStatus(@Param('jobId') id: string): Promise<ImportStatusView> {
    const job = await this.importJobService.findById(id);
    const metrics = await this.importJobService.getMetrics(id);

    const view = {
      ...this.jobToView(job),
      duration: metrics.duration,
      rowsPerSecond: metrics.rowsPerSecond,
    };

    // For image imports, map row counts to file counts
    // The UI expects totalFiles, processedFiles, successFiles, failedFiles
    // but ImportJob stores these as totalRows, processedRows, successRows, failedRows
    return {
      ...view,
      totalFiles: job.totalRows || 0,
      processedFiles: job.processedRows || 0,
      successFiles: job.successRows || 0,
      failedFiles: job.failedRows || 0,
    } as any;
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
      rawData: error.rawData,
      createdAt: error.createdAt,
    };
  }
}
