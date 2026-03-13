import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { ImportJobCreatedEvent } from '../events';
import { ImportJobService } from './import-job.service';
import { ImportProgressService } from './import-progress.service';
import { CsvParserService, CsvRow } from './csv-parser.service';
import { ImportValidationService, ValidationError } from './import-validation.service';
import { ProductService } from '@modules/catalog/services/product.service';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

const BATCH_SIZE = 50;

@Injectable()
export class ImportProcessorService {
  private readonly logger = new Logger(ImportProcessorService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'import');

  constructor(
    private readonly importJobService: ImportJobService,
    private readonly progressService: ImportProgressService,
    private readonly csvParserService: CsvParserService,
    private readonly validationService: ImportValidationService,
    private readonly productService: ProductService,
  ) {}

  @OnEvent(IMPORT_EVENTS.JOB_CREATED, { async: true })
  async handleJobCreated(event: ImportJobCreatedEvent): Promise<void> {
    this.logger.log(`Processing import job: ${event.jobId}`);

    const workerId = `processor-${process.pid}`;

    try {
      const locked = await this.importJobService.acquireLock(event.jobId, workerId);
      if (!locked) {
        this.logger.warn(`Job ${event.jobId} already locked by another worker`);
        return;
      }

      await this.processJob(event.jobId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Import job ${event.jobId} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      try {
        await this.progressService.markFailed(
          event.jobId,
          error instanceof Error ? error : new Error(errorMessage),
        );
      } catch {
        this.logger.error(`Failed to mark job ${event.jobId} as failed`);
      }
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.importJobService.findById(jobId);

    const filePath = this.resolveFilePath(job.originalFilePath ?? job.fileUrl);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Import file not found: ${filePath}`);
    }

    this.logger.log(`Reading CSV from: ${filePath}`);

    const context = await this.validationService.buildValidationContext();
    const fileStream = fs.createReadStream(filePath);

    let processedRows = 0;
    let successRows = 0;
    let failedRows = 0;
    const batchErrors: ValidationError[] = [];

    for await (const { rowNumber, data } of this.csvParserService.parseStream(
      fileStream as unknown as Readable,
    )) {
      if (await this.progressService.shouldCancel(jobId)) {
        this.logger.log(`Job ${jobId} cancelled at row ${rowNumber}`);
        return;
      }

      const result = await this.validationService.validateRow(rowNumber, data, context);

      if (!result.isValid) {
        failedRows++;
        batchErrors.push(...result.errors);
        for (const err of result.errors) {
          this.logger.warn(`Row ${rowNumber} validation: [${err.field ?? '-'}] ${err.message}`);
        }
      } else {
        try {
          await this.createProductFromRow(data, context);
          successRows++;
        } catch (error) {
          failedRows++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          batchErrors.push({
            rowNumber,
            sku: data.sku,
            field: undefined,
            message: `Failed to create product: ${errorMessage}`,
            severity: 'error',
          });
          this.logger.warn(`Row ${rowNumber} (${data.sku}): ${errorMessage}`);
        }
      }

      processedRows++;

      if (processedRows % BATCH_SIZE === 0) {
        await this.flushProgress(jobId, processedRows, successRows, failedRows, batchErrors);
        batchErrors.length = 0;
      }
    }

    if (batchErrors.length > 0 || processedRows % BATCH_SIZE !== 0) {
      await this.flushProgress(jobId, processedRows, successRows, failedRows, batchErrors);
    }

    await this.progressService.markCompleted(jobId);

    this.logger.log(
      `Job ${jobId} completed: ${successRows} created, ${failedRows} failed out of ${processedRows} rows`,
    );
  }

  private async createProductFromRow(
    row: CsvRow,
    context: { categoryMap: Map<string, string> },
  ): Promise<void> {
    const productName = row.productName!.trim();
    const sku = row.sku!.trim();
    const categoryPath = row.category!.trim();
    const price = parseFloat(row.price!);
    const stock = parseInt(row.stock!, 10);

    const categoryId = context.categoryMap.get(categoryPath) ?? null;

    const slug = await this.productService.generateUniqueSlug(productName);

    const product = await this.productService.create(
      sku,
      productName,
      slug,
      null,
      undefined,
      price,
      null,
      null,
      undefined,
      stock,
      categoryId,
      false,
      null,
      undefined,
    );

    this.logger.debug(`Created product "${productName}" (${product.id}) with SKU ${sku}`);
  }

  private async flushProgress(
    jobId: string,
    processedRows: number,
    successRows: number,
    failedRows: number,
    errors: ValidationError[],
  ): Promise<void> {
    await this.progressService.updateProgress({
      jobId,
      processedRows,
      successRows,
      failedRows,
      lastProcessedRow: processedRows,
    });

    if (errors.length > 0) {
      await this.progressService.recordErrors(jobId, errors);
    }
  }

  private resolveFilePath(fileUrlOrPath: string): string {
    if (path.isAbsolute(fileUrlOrPath)) {
      return fileUrlOrPath;
    }

    const cleaned = fileUrlOrPath.replace(/^\/uploads\/import\//, '');
    return path.join(this.uploadDir, cleaned);
  }
}
