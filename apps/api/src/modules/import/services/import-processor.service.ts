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

    // Skip simple product imports - handled by SimpleProductImportProcessorService
    if (event.importType === 'SIMPLE_PRODUCTS') {
      this.logger.log(`Skipping simple product job ${event.jobId} - handled by BullMQ worker`);
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
    const importMode = job.mode || 'UPSERT';
    this.logger.log(`Import mode: ${importMode}`);
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
          const product = await this.upsertProductFromRow(data, context, importMode);
          successRows++;
          successRecords.push({
            rowNumber,
            sku: product.sku,
            field: undefined,
            message: product.updated ? `Updated: ${product.name}` : `Created: ${product.name}`,
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

  private async upsertProductFromRow(
    row: CsvRow,
    context: { cellSkuMap: Map<string, string>; cellSlugMap: Map<string, string> },
    importMode: string,
  ): Promise<{ id: string; sku: string; name: string; updated: boolean }> {
    const productName = row.product_name!.trim();
    const productSku = row.product_sku?.trim() || '';
    const productSlug = row.product_slug?.trim() || '';
    const description = row.description?.trim() || null;

    let cellId: string | null = null;
    const cellRef = row.cell_slug?.trim() || row.cell_sku?.trim() || '';
    if (cellRef) {
      cellId = context.cellSkuMap.get(cellRef) ?? context.cellSlugMap.get(cellRef) ?? null;
    }

    // Look up existing product by SKU
    let existingProduct = await this.db.product.findFirst({
      where: {
        metadata: {
          path: ['userSku'],
          equals: productSku,
        },
      },
    });

    if (!existingProduct) {
      existingProduct = await this.db.product.findFirst({
        where: { sku: productSku },
      });
    }

    if (existingProduct && importMode === 'CREATE_ONLY') {
      throw new Error(`Product already exists: ${productSku} (CREATE_ONLY mode)`);
    }

    if (!existingProduct && importMode === 'UPDATE_ONLY') {
      throw new Error(`Product not found: ${productSku} (UPDATE_ONLY mode)`);
    }

    if (existingProduct) {
      const updated = await this.productService.update(existingProduct.id, {
        name: productName,
        ...(productSlug ? { slug: productSlug } : {}),
        ...(cellId !== null ? { cellId } : {}),
        ...(description !== null ? { description } : {}),
      });
      this.logger.debug(`Updated product "${productName}" (${existingProduct.id}), mode: ${importMode}`);
      await this.processTableColumns(updated.id, row);
      return { id: updated.id, sku: updated.sku ?? productSku, name: productName, updated: true };
    }

    const slug = productSlug || await this.productService.generateUniqueSlug(productName);

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

    return { id: product.id, sku: product.sku ?? '', name: productName, updated: false };
  }

  private async processTableColumns(productId: string, row: CsvRow): Promise<void> {
    const tableColumns: Array<{ attributeId: string; position: number; unitId?: string }> = [];

    for (let i = 1; i <= 15; i++) {
      const rawHead = row[`at_head${i}`]?.trim();
      if (rawHead) {
        const [slug, unitName] = rawHead.split(';');
        const trimmedSlug = slug.trim();

        const attribute = await this.db.attributeDefinition.findUnique({
          where: { slug: trimmedSlug },
        });
        if (attribute) {
          let unitId: string | undefined;
          if (unitName) {
            const trimmedUnit = unitName.trim();
            const unit = await this.db.unitDefinition.findUnique({
              where: { name: trimmedUnit },
            });
            if (unit) {
              unitId = unit.id;
            } else {
              this.logger.warn(`Unit not found for column at_head${i}: ${trimmedUnit}`);
            }
          }
          tableColumns.push({
            attributeId: attribute.id,
            position: i,
            ...(unitId ? { unitId } : {}),
          });
        } else {
          this.logger.warn(`Attribute not found for column at_head${i}: ${trimmedSlug}`);
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
