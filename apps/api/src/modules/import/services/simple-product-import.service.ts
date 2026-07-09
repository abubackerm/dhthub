import { Injectable, Logger } from '@nestjs/common';
import { DatabaseProvider } from '@core/database';
import { CsvParserService } from './csv-parser.service';
import { SimpleProductService } from '@modules/catalog/services/simple-product.service';
import { ImportJobService } from './import-job.service';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../../storage/storage.service';

interface CategoryMap {
  [sku: string]: { id: string; name: string };
}

interface AttributeValueOperation {
  productId: string;
  attributeId: string;
  rawValue: string;
  dataType: string;
}

@Injectable()
export class SimpleProductImportService {
  private readonly logger = new Logger(SimpleProductImportService.name);
  private readonly batchSize = 500;
  private tempFiles: string[] = [];

  constructor(
    private readonly db: DatabaseProvider,
    private readonly csvParserService: CsvParserService,
    private readonly simpleProductService: SimpleProductService,
    private readonly importJobService: ImportJobService,
    private readonly importErrorRepository: ImportErrorRepository,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Main entry point - process simple product import job
   */
  async processSimpleProductImport(jobId: string, csvFilePath: string): Promise<void> {
    this.logger.log(`Processing simple product import job: ${jobId}`);

    const workerId = `worker-${process.pid}`;

    try {
      await this.importJobService.markAsProcessing(jobId, workerId);

      // Count total rows and update job
      const totalRows = await this.countTotalRows(csvFilePath);
      await this.importJobService.updateTotalRows(jobId, totalRows);
      this.logger.log(`Total simple product rows to import: ${totalRows}`);

      // Preload category SKU map for O(1) lookups
      const categoryMap = await this.loadCategoryMap();
      this.logger.log(`Loaded ${Object.keys(categoryMap).length} categories from database`);

      // Download if URL
      const { localPath } = await this.downloadIfUrl(csvFilePath);

      // Process CSV
      const result = await this.processRows(localPath, categoryMap, jobId);

      // Update final progress
      await this.importJobService.updateProgress(jobId, {
        processedRows: result.processed,
        successRows: result.success,
        failedRows: result.failed,
      });

      await this.importJobService.markAsCompleted(jobId);
      this.logger.log(
        `Simple product import job ${jobId} completed: ${result.success} success, ${result.failed} failed out of ${result.processed} rows`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Simple product import job ${jobId} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.importJobService.markAsFailed(jobId);
      throw error;
    } finally {
      // Clean up temp files
      await this.cleanupTempFiles();
    }
  }

  /**
   * Count total data rows in CSV file
   */
  private async countTotalRows(csvFilePath: string): Promise<number> {
    const { localPath } = await this.downloadIfUrl(csvFilePath);

    if (!fs.existsSync(localPath)) {
      return 0;
    }

    const stream = fs.createReadStream(localPath, { encoding: 'utf8' });
    return this.csvParserService.countRows(stream);
  }

  /**
   * Preload all categories by SKU for O(1) lookup
   */
  private async loadCategoryMap(): Promise<CategoryMap> {
    const categoryMap: CategoryMap = {};

    const categories = await this.db.category.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
      },
    });

    for (const category of categories) {
      if (category.sku) {
        categoryMap[category.sku] = {
          id: category.id,
          name: category.name,
        };
      }
    }

    return categoryMap;
  }

  /**
   * Process CSV rows - streaming approach
   */
  private async processRows(
    filePath: string,
    categoryMap: CategoryMap,
    jobId: string,
  ): Promise<{ processed: number; success: number; failed: number }> {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let attrValueBatch: AttributeValueOperation[] = [];

    this.logger.log(`Starting to process simple products file: ${filePath}`);

    try {
      for await (const { data, rowNumber } of this.csvParserService.parseStream(fileStream)) {
        try {
          const categorySku = (data.category_sku || '').trim();
          const name = (data.name || '').trim();
          const description = (data.description || '').trim() || undefined;
          const priceRaw = (data.price || '').trim();
          const quantityRaw = (data.quantity || '').trim();

          // Skip completely empty rows
          if (!categorySku && !name && !data.description && !data.price && !data.quantity) {
            this.logger.debug(`Skipping empty row ${rowNumber}`);
            continue;
          }

          processedCount++;

          // Validate required fields
          if (!categorySku) {
            await this.recordError(
              jobId,
              rowNumber,
              null,
              'Missing required field: category_sku',
              data,
              'simple-products.csv',
            );
            errorCount++;
            continue;
          }

          if (!name) {
            await this.recordError(
              jobId,
              rowNumber,
              null,
              'Missing required field: name',
              data,
              'simple-products.csv',
            );
            errorCount++;
            continue;
          }

          // Look up category by SKU
          const category = categoryMap[categorySku];
          if (!category) {
            await this.recordError(
              jobId,
              rowNumber,
              null,
              `Category not found for SKU: ${categorySku}`,
              data,
              'simple-products.csv',
            );
            errorCount++;
            continue;
          }

          // Parse optional numeric fields
          const price = priceRaw ? parseInt(priceRaw.replace(/[^0-9.\-]/g, ''), 10) : undefined;
          const quantity = quantityRaw ? parseInt(quantityRaw, 10) : undefined;

          // Create the simple product via SimpleProductService
          // This handles auto-creating a "General" cell, auto-generating SKU (P-{8 chars}),
          // creating the product with type=SIMPLE, and auto-creating a default variant
          const product = await this.simpleProductService.create(category.id, {
            name,
            ...(description !== undefined ? { description } : {}),
            ...(price !== undefined && !isNaN(price) ? { price } : {}),
            ...(quantity !== undefined && !isNaN(quantity) ? { quantity } : {}),
          });

          // Parse attribute pairs from CSV row
          const attributePairs = this.parseAttributePairs(data);
          for (const { slug, value } of attributePairs) {
            // Look up attribute definition
            let attribute = await this.db.attributeDefinition.findUnique({
              where: { slug },
            });

            // Auto-create missing attribute definitions
            if (!attribute) {
              attribute = await this.db.attributeDefinition.create({
                data: {
                  slug,
                  name: this.humanizeSlug(slug),
                  dataType: 'text',
                  isFilterable: false,
                  isRequired: false,
                  sortOrder: 0,
                },
              });
              this.logger.log(`Auto-created attribute definition: ${slug} -> ${attribute.id}`);
            }

            attrValueBatch.push({
              productId: product.id,
              attributeId: attribute.id,
              rawValue: value,
              dataType: attribute.dataType,
            });
          }

          successCount++;

          // Flush attribute value batch if threshold reached
          if (attrValueBatch.length >= this.batchSize) {
            await this.flushAttributeValueBatch(attrValueBatch, jobId);
            attrValueBatch = [];
          }

          // Flush progress every batchSize rows
          if (processedCount % this.batchSize === 0) {
            await this.importJobService.updateProgress(jobId, {
              processedRows: processedCount,
              successRows: successCount,
              failedRows: errorCount,
            });
            this.logger.log(
              `Progress: ${processedCount} rows processed, ${successCount} success, ${errorCount} errors`,
            );
          }
        } catch (rowError) {
          const errorMessage = rowError instanceof Error ? rowError.message : String(rowError);
          await this.recordError(
            jobId,
            rowNumber,
            String(data.name || ''),
            errorMessage,
            data,
            'simple-products.csv',
          );
          errorCount++;
          processedCount++;
        }
      }

      // Flush remaining attribute value batch
      if (attrValueBatch.length > 0) {
        await this.flushAttributeValueBatch(attrValueBatch, jobId);
      }

      this.logger.log(
        `Simple products import complete: ${processedCount} processed, ${successCount} success, ${errorCount} errors`,
      );
    } catch (streamError) {
      const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
      this.logger.error(`Error processing simple products CSV: ${errorMessage}`);
    }

    // Final progress update
    await this.importJobService.updateProgress(jobId, {
      processedRows: processedCount,
      successRows: successCount,
      failedRows: errorCount,
    });

    return { processed: processedCount, success: successCount, failed: errorCount };
  }

  /**
   * Parse attribute pairs from CSV row data.
   * Scans for columns matching attr_slug_N and attr_value_N patterns.
   */
  private parseAttributePairs(data: Record<string, string | undefined>): Array<{ slug: string; value: string }> {
    const pairs: Array<{ slug: string; value: string }> = [];

    // Find all attr_slug_N columns
    const attrSlugRegex = /^attr_slug_(\d+)$/;
    const slugColumns: Array<{ index: number; key: string }> = [];

    for (const key of Object.keys(data)) {
      const match = key.match(attrSlugRegex);
      if (match) {
        slugColumns.push({ index: parseInt(match[1], 10), key });
      }
    }

    // Sort by index to process in order
    slugColumns.sort((a, b) => a.index - b.index);

    for (const { index } of slugColumns) {
      const slug = (data[`attr_slug_${index}`] || '').trim();
      const value = (data[`attr_value_${index}`] || '').trim();

      // Both slug and value must be non-empty
      if (slug && value) {
        pairs.push({ slug, value });
      }
    }

    return pairs;
  }

  /**
   * Flush a batch of attribute value operations in a single transaction
   */
  private async flushAttributeValueBatch(
    batch: AttributeValueOperation[],
    _jobId: string,
  ): Promise<void> {
    if (batch.length === 0) return;

    await this.db.$transaction(async (prisma) => {
      for (const op of batch) {
        const rawValue = op.rawValue.trim();

        // Build the data based on dataType
        const data: any = {
          productId: op.productId,
          attributeId: op.attributeId,
          rawValue,
        };

        if (op.dataType === 'number') {
          const numericValue = this.parseMeasurement(rawValue);
          if (numericValue !== null) {
            data.numberValue = numericValue;
          }
          data.textValue = rawValue;
        } else if (op.dataType === 'boolean') {
          data.booleanValue = rawValue.toLowerCase() === 'true' || rawValue === '1';
          data.textValue = rawValue;
        } else {
          data.textValue = rawValue;
        }

        await (prisma as any).productAttributeValue.upsert({
          where: {
            productId_attributeId: {
              productId: op.productId,
              attributeId: op.attributeId,
            },
          },
          create: data,
          update: data,
        });
      }
    });

    this.logger.debug(`Flushed ${batch.length} attribute value operations`);
  }

  /**
   * Parse measurement strings like "3/4", "1-1/2", "2.5" into numeric values
   */
  private parseMeasurement(value: string): number | null {
    if (!value || value.trim() === '') return null;

    // Strip trailing unit symbols to expose the numeric portion
    const cleanValue = value
      .trim()
      .replace(/["""''`\u00b0]+$/, '')
      .replace(/\s*(mm|cm|m|in|ft|yd|kg|g|lb|oz|°F|°C)$/i, '');

    // Match mixed number: "1-1/2" or "1 1/2" → whole + fraction
    const mixedMatch = cleanValue.match(/^(\d+)\s*[-\s]\s*(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10);
      const num = parseInt(mixedMatch[2], 10);
      const den = parseInt(mixedMatch[3], 10);
      if (den !== 0) return whole + num / den;
    }

    // Match fraction: "3/4" → fraction
    const fracMatch = cleanValue.match(/^(\d+)\/(\d+)$/);
    if (fracMatch) {
      const num = parseInt(fracMatch[1], 10);
      const den = parseInt(fracMatch[2], 10);
      if (den !== 0) return num / den;
    }

    // Fallback to plain decimal/integer
    const numValue = parseFloat(cleanValue.replace(/[^\d.\-]/g, ''));
    return !isNaN(numValue) ? numValue : null;
  }

  /**
   * Record an import error
   */
  private async recordError(
    jobId: string,
    rowNumber: number,
    sku: string | null,
    message: string,
    rawData: any,
    sourceFile: string,
  ): Promise<void> {
    await this.importErrorRepository.create({
      jobId,
      rowNumber,
      sku: sku ?? null,
      message,
      rawData: rawData ?? null,
      sourceFile: sourceFile ?? null,
    });
  }

  /**
   * Check if a path is a SeaweedFS URL
   */
  private isSeaweedFSUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  /**
   * Download file from SeaweedFS URL to local temp directory if it's a URL,
   * otherwise return the original local path.
   */
  private async downloadIfUrl(
    filePath: string,
  ): Promise<{ localPath: string; isTemp: boolean }> {
    if (!this.isSeaweedFSUrl(filePath)) {
      return { localPath: filePath, isTemp: false };
    }

    // Extract storage key from URL
    const urlParts = new URL(filePath);
    const storageKey = urlParts.pathname;

    this.logger.log(`Downloading file from SeaweedFS: ${storageKey}`);

    // Download to temp file
    const buffer = await this.storageService.getFile(storageKey);
    const tempDir = path.join(process.cwd(), 'uploads', 'import', 'temp');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `${Date.now()}-${path.basename(storageKey)}`);
    await fs.promises.writeFile(tempFilePath, buffer);

    // Track temp file for cleanup
    this.tempFiles.push(tempFilePath);

    this.logger.log(`Downloaded to temp file: ${tempFilePath}`);

    return { localPath: tempFilePath, isTemp: true };
  }

  /**
   * Clean up all temporary files
   */
  private async cleanupTempFiles(): Promise<void> {
    for (const tempFile of this.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          this.logger.debug(`Cleaned up temp file: ${tempFile}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to cleanup temp file ${tempFile}: ${error}`);
      }
    }
    this.tempFiles = [];
  }

  /**
   * Convert a slug to a human-readable name.
   * E.g. "amos-code" -> "Amos Code", "part-number" -> "Part Number"
   */
  private humanizeSlug(slug: string): string {
    return slug
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
