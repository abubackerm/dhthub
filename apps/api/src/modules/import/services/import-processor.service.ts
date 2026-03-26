import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IMPORT_EVENTS } from '@shared/events/event-constants';
import { DatabaseProvider } from '@core/database';
import { ImportJobCreatedEvent } from '../events';
import { ImportJobService } from './import-job.service';
import { ImportProgressService } from './import-progress.service';
import { CsvParserService, CsvRow } from './csv-parser.service';
import { ImportValidationService, ValidationError } from './import-validation.service';
import { ProductService } from '@modules/catalog/services/product.service';
import { ProductStatus } from '@modules/catalog/entities/product.entity';
import { ImportFileType } from '../entities';
import { StorageService } from '@modules/storage/storage.service';
import { CatalogImportService } from './catalog-import.service';
import { Readable } from 'stream';

const BATCH_SIZE = 50;

@Injectable()
export class ImportProcessorService {
  private readonly logger = new Logger(ImportProcessorService.name);

  constructor(
    private readonly importJobService: ImportJobService,
    private readonly progressService: ImportProgressService,
    private readonly csvParserService: CsvParserService,
    private readonly validationService: ImportValidationService,
    private readonly productService: ProductService,
    private readonly storageService: StorageService,
    private readonly catalogImportService: CatalogImportService,
    private readonly db: DatabaseProvider,
  ) {}

  @OnEvent(IMPORT_EVENTS.JOB_CREATED, { async: true })
  async handleJobCreated(event: ImportJobCreatedEvent): Promise<void> {
    this.logger.log(`Processing import job: ${event.jobId}, type: ${event.type}`);

    // Only process CSV file types with this processor
    // ZIP files are handled by CatalogImportProcessorService -> BullMQ worker
    if (event.type === ImportFileType.ZIP) {
      this.logger.log(`Skipping ZIP job ${event.jobId} - handled by BullMQ worker`);
      return;
    }

    // Skip category imports - handled by CategoryImportProcessorService
    if (
      event.importType === 'CATEGORY_CREATE' ||
      event.importType === 'CATEGORY_UPDATE' ||
      event.importType === 'CATEGORY_EDIT'
    ) {
      this.logger.log(`Skipping category job ${event.jobId} - handled by BullMQ worker`);
      return;
    }

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

    const storageKey = job.originalFilePath ?? job.fileUrl;
    this.logger.log(`Reading CSV from SeaweedFS: ${storageKey}`);

    const fileBuffer = await this.storageService.getFile(storageKey);

    // Detect CSV type from headers — variants-only CSVs must be in a ZIP
    const headerCheckStream = Readable.from(fileBuffer);
    const headers = await this.csvParserService.getHeaders(headerCheckStream);

    if (headers.includes('product_sku') && !headers.includes('product_name')) {
      this.logger.log(`Job ${jobId} detected as variants-only CSV — delegating to CatalogImportService`);
      try {
        const result = await this.catalogImportService.processStandaloneVariantsCsv(jobId, fileBuffer);
        await this.progressService.markCompleted(jobId);
        this.logger.log(
          `Job ${jobId} completed: ${result.success} created, ${result.failed} failed out of ${result.processed} rows`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Standalone variants import failed for job ${jobId}: ${errorMessage}`);
        await this.progressService.markFailed(jobId, error instanceof Error ? error : new Error(errorMessage));
      }
      return;
    }

    const context = await this.validationService.buildValidationContext();
    const fileStream = Readable.from(fileBuffer);

    let processedRows = 0;
    let successRows = 0;
    let failedRows = 0;
    const batchErrors: ValidationError[] = [];
    const successRecords: ValidationError[] = [];

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
          const product = await this.createProductFromRow(data, context);
          successRows++;
          successRecords.push({
            rowNumber,
            sku: product.sku,
            field: undefined,
            message: `Created: ${product.name}`,
            severity: 'error',
          });
        } catch (error) {
          failedRows++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          batchErrors.push({
            rowNumber,
            sku: data.product_name,
            field: undefined,
            message: `Failed to create product: ${errorMessage}`,
            severity: 'error',
          });
          this.logger.warn(`Row ${rowNumber} (${data.product_name}): ${errorMessage}`);
        }
      }

      processedRows++;

      if (processedRows % BATCH_SIZE === 0) {
        await this.flushProgress(jobId, processedRows, successRows, failedRows, batchErrors, successRecords);
        batchErrors.length = 0;
        successRecords.length = 0;
      }
    }

    if (batchErrors.length > 0 || successRecords.length > 0 || processedRows % BATCH_SIZE !== 0) {
      await this.flushProgress(jobId, processedRows, successRows, failedRows, batchErrors, successRecords);
    }

    await this.progressService.markCompleted(jobId);

    this.logger.log(
      `Job ${jobId} completed: ${successRows} created, ${failedRows} failed out of ${processedRows} rows`,
    );
  }

  private async createProductFromRow(
    row: CsvRow,
    context: { cellSkuMap: Map<string, string>; cellSlugMap: Map<string, string> },
  ): Promise<{ id: string; sku: string; name: string }> {
    const productName = row.product_name!.trim();
    const description = row.description?.trim() || null;

    let cellId: string | null = null;
    if (row.cell_sku) {
      cellId = context.cellSkuMap.get(row.cell_sku) ?? context.cellSlugMap.get(row.cell_sku) ?? null;
    }

    const slug = await this.productService.generateUniqueSlug(productName);

    const product = await this.productService.create(
      null,
      productName,
      slug,
      description,
      undefined,
      undefined,
      null,
      null,
      undefined,
      undefined,
      cellId,
      false,
      null,
      undefined,
      ProductStatus.ACTIVE,
    );

    this.logger.debug(`Created product "${productName}" (${product.id}) with SKU ${product.sku}`);

    await this.processTableColumns(product.id, row);

    return { id: product.id, sku: product.sku ?? '', name: productName };
  }

  private async processTableColumns(productId: string, row: CsvRow): Promise<void> {
    const tableColumns: Array<{ attributeId: string; position: number }> = [];

    for (let i = 1; i <= 15; i++) {
      const attrSlug = row[`at_head${i}`]?.trim();
      if (attrSlug) {
        const attribute = await this.db.attributeDefinition.findUnique({
          where: { slug: attrSlug },
        });
        if (attribute) {
          tableColumns.push({ attributeId: attribute.id, position: i });
        } else {
          this.logger.warn(`Attribute not found for column at_head${i}: ${attrSlug}`);
        }
      }
    }

    if (tableColumns.length > 0) {
      await this.db.$transaction(async (prisma) => {
        await prisma.productTableColumn.deleteMany({
          where: { productId },
        });
        for (const column of tableColumns) {
          await prisma.productTableColumn.create({
            data: { productId, ...column },
          });
        }
      });
      this.logger.debug(`Created ${tableColumns.length} table columns for product ${productId}`);
    }
  }

  private async flushProgress(
    jobId: string,
    processedRows: number,
    successRows: number,
    failedRows: number,
    errors: ValidationError[],
    successRecords: ValidationError[],
  ): Promise<void> {
    await this.progressService.updateProgress({
      jobId,
      processedRows,
      successRows,
      failedRows,
      lastProcessedRow: processedRows,
    });

    if (successRecords.length > 0) {
      await this.progressService.recordErrors(jobId, successRecords, 'success');
    }

    if (errors.length > 0) {
      await this.progressService.recordErrors(jobId, errors, 'error');
    }
  }
}
