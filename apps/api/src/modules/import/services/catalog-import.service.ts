import { Injectable, Logger } from '@nestjs/common';
import { DatabaseProvider } from '@core/database';
import { CsvParserService } from './csv-parser.service';
import { ImportJobService } from './import-job.service';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { ExtractedFiles } from '../dto';
import * as fs from 'fs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImageImportService } from './image-import.service';

const SYSTEM_FIELDS = ['product_slug', 'sku', 'price', 'stock'];

export interface ProductMap {
  [slug: string]: { id: string; name: string; cellSlug: string };
}

export interface AttributeMap {
  [slug: string]: { id: string; name: string; dataType: string };
}

export interface ImportContext {
  jobId: string;
  productMap: ProductMap;
  attributeMap: AttributeMap;
}

export interface CsvRowExtended {
  [key: string]: string | undefined;
}

export interface VariantBatchItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

@Injectable()
export class CatalogImportService {
  private readonly logger = new Logger(CatalogImportService.name);
  private readonly batchSize = 500;

  constructor(
    private readonly db: DatabaseProvider,
    private readonly csvParserService: CsvParserService,
    private readonly importJobService: ImportJobService,
    private readonly importErrorRepository: ImportErrorRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly imageImportService: ImageImportService,
  ) {}

  private async updateJobProgress(
    jobId: string,
    data: {
      processedRows: number;
      successRows: number;
      failedRows: number;
    },
  ): Promise<void> {
    await this.importJobService.updateProgress(jobId, data);
  }

  /**
   * Main entry point - process catalog import job
   */
  async processCatalogImport(jobId: string, extractedFiles: ExtractedFiles): Promise<void> {
    this.logger.log(`Processing catalog import job: ${jobId}`);

    const workerId = `worker-${process.pid}`;

    try {
      await this.importJobService.markAsProcessing(jobId, workerId);

      // Count variant rows (the primary import entity) and update the job
      const totalRows = await this.countTotalRows(extractedFiles);
      await this.importJobService.updateTotalRows(jobId, totalRows);
      this.logger.log(`Total variant rows to import: ${totalRows}`);

      const context: ImportContext = {
        jobId,
        productMap: {},
        attributeMap: {},
      };

      // Step 1: Import products (if provided)
      if (extractedFiles.products) {
        this.logger.log(`Step 1: Importing products from ${extractedFiles.products}`);
        const result = await this.step1_importProducts(extractedFiles.products, jobId);
        context.productMap = result.productMap;
        this.logger.log(`Products step: ${result.success} success, ${result.failed} failed`);
      }

      // Step 2: Import attributes (if provided)
      if (extractedFiles.attributes) {
        this.logger.log(`Step 2: Importing attributes from ${extractedFiles.attributes}`);
        context.attributeMap = await this.step2_importAttributes(extractedFiles.attributes, jobId);
      }

      // Step 3: Import variants (required) - this is the primary import step
      if (!extractedFiles.variants) {
        throw new Error('variants.csv path is missing from extracted files');
      }
      this.logger.log(`Step 3: Importing variants from ${extractedFiles.variants}`);
      const variantResult = await this.step3_importVariants(extractedFiles.variants, context, jobId);

      // Update final progress based on variant counts (the primary import entity)
      await this.updateJobProgress(jobId, {
        processedRows: variantResult.processed,
        successRows: variantResult.success,
        failedRows: variantResult.failed,
      });

      // Step 4: Import images (if provided)
      if (extractedFiles.images) {
        this.logger.log(`Step 4: Importing images from ${extractedFiles.images}`);
        await this.step4_importImages(extractedFiles.images, jobId);
      }

      // Step 5: Update search index
      this.logger.log(`Step 5: Updating search index`);
      await this.step5_updateSearchIndex(jobId);

      await this.importJobService.markAsCompleted(jobId);
      this.logger.log(`Catalog import job ${jobId} completed: ${variantResult.success} success, ${variantResult.failed} failed out of ${variantResult.processed} variants processed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Catalog import job ${jobId} failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      await this.importJobService.markAsFailed(jobId);
      throw error;
    }
  }

  /**
   * Count total data rows in the variants CSV (the primary import entity).
   * Products/attributes are supporting data; variants represent the actual items imported.
   */
  private async countTotalRows(extractedFiles: ExtractedFiles): Promise<number> {
    if (!extractedFiles.variants || !fs.existsSync(extractedFiles.variants)) {
      return 0;
    }
    const stream = fs.createReadStream(extractedFiles.variants, { encoding: 'utf8' });
    return this.csvParserService.countRows(stream);
  }

  /**
   * Step 1: Import products from CSV
   */
  private async step1_importProducts(
    filePath: string,
    jobId: string,
  ): Promise<{ productMap: ProductMap; processed: number; success: number; failed: number }> {
    const productMap: ProductMap = {};
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    this.logger.log(`Starting to process products file: ${filePath}`);

    try {
      for await (const { data, rowNumber } of this.csvParserService.parseStream(fileStream)) {
        try {
          const productSlug = (data.product_slug || '').trim();
          const productName = (data.product_name || '').trim();
          const cellSlug = (data.cell_slug || '').trim();
          const description = (data.description || '').trim();

          this.logger.debug(`Processing products row ${rowNumber}: ${JSON.stringify(data)}`);

          if (!productSlug && !productName && !cellSlug && !description) {
            this.logger.debug(`Skipping empty row ${rowNumber}`);
            continue;
          }

          processedCount++;

          if (!productSlug || !productName) {
            await this.recordError(jobId, rowNumber, null, 'Missing required fields: product_slug, product_name', data, 'products.csv');
            errorCount++;
            continue;
          }

          let cellId: string | null = null;
          if (cellSlug) {
            const cell = await this.db.cell.findUnique({
              where: { slug: cellSlug },
            });

            if (cell) {
              cellId = cell.id;
            } else {
              this.logger.warn(`Cell not found: ${cellSlug}, creating default cell`);
              // Try to find category from slug format "category-cell" or create from cell slug
              const categoryName = cellSlug.split('-')[0];
              const category = await this.db.category.findFirst({
                where: { slug: categoryName },
              });

              if (category) {
                const newCell = await this.db.cell.create({
                  data: {
                    name: cellSlug,
                    slug: cellSlug,
                    categoryId: category.id,
                  },
                });
                cellId = newCell.id;
              } else {
                this.logger.error(`Cannot create cell: category not found for ${cellSlug}`);
                await this.recordError(jobId, rowNumber, productSlug, `Cell not found and cannot create: ${cellSlug}`, data, 'products.csv');
                errorCount++;
                continue;
              }
            }
          }

          // Upsert product - create if not exists, update if already exists
          let product;
          const existingProduct = await this.db.product.findUnique({
            where: { slug: productSlug },
          });

          if (existingProduct) {
            // Update existing product
            product = await this.db.product.update({
              where: { id: existingProduct.id },
              data: {
                name: productName,
                cellId: cellId,
                description: description || existingProduct.description,
              },
            });
            this.logger.log(`Updated existing product: ${productSlug}`);
          } else {
            // Create new product
            product = await this.db.product.create({
              data: {
                slug: productSlug,
                name: productName,
                cellId: cellId,
                description: description || null,
                type: 'variable',
                status: 'active',
              },
            });
            this.logger.log(`Created new product: ${productSlug}`);
          }

          productMap[productSlug] = {
            id: product.id,
            name: product.name,
            cellSlug,
          };

          successCount++;
          this.logger.debug(`Imported product: ${productSlug}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.recordError(jobId, rowNumber, String(data.product_slug || ''), errorMessage, data, 'products.csv');
          errorCount++;
          processedCount++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing products.csv: ${errorMessage}`);
    }

    this.logger.log(`Products import complete: ${processedCount} processed, ${successCount} success, ${errorCount} errors`);
    return { productMap, processed: processedCount, success: successCount, failed: errorCount };
  }

  /**
   * Step 2: Import attributes from CSV
   */
  private async step2_importAttributes(filePath: string, jobId: string): Promise<AttributeMap> {
    const attributeMap: AttributeMap = {};
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });

    try {
      for await (const { data, rowNumber } of this.csvParserService.parseStream(fileStream)) {
        try {
          // Trim and convert values
          const attributeSlug = (data.attribute_slug || '').trim();
          const attributeName = (data.name || '').trim();
          const dataType = (data.type || 'text').toLowerCase().trim();

          // Skip completely empty rows
          if (!attributeSlug && !attributeName) {
            this.logger.debug(`Skipping empty attributes row ${rowNumber}`);
            continue;
          }

          if (!attributeSlug || !attributeName) {
            await this.recordError(jobId, rowNumber, null, 'Missing required fields: attribute_slug, name', data, 'attributes.csv');
            continue;
          }

          const validTypes = ['number', 'text', 'enum', 'boolean'];
          if (!validTypes.includes(dataType)) {
            await this.recordError(jobId, rowNumber, null, `Invalid type: ${dataType}. Must be: ${validTypes.join(', ')}`, data, 'attributes.csv');
            continue;
          }

          const attribute = await this.db.attributeDefinition.upsert({
            where: { slug: attributeSlug },
            update: {
              name: attributeName,
              dataType: dataType as any,
              sortOrder: Number(data.display_order || 0),
            },
            create: {
              slug: attributeSlug,
              name: attributeName,
              dataType: dataType as any,
              sortOrder: Number(data.display_order || 0),
              isRequired: false,
              isFilterable: true,
            },
          });

          attributeMap[attributeSlug] = {
            id: attribute.id,
            name: attribute.name,
            dataType: attribute.dataType,
          };

          this.logger.debug(`Imported attribute: ${attributeSlug}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.recordError(jobId, rowNumber, String(data.sku || ''), errorMessage, data, 'attributes.csv');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing attributes.csv: ${errorMessage}`);
    }

    return attributeMap;
  }

  /**
   * Step 3: Import variants from CSV
   */
  private async step3_importVariants(
    filePath: string,
    context: ImportContext,
    jobId: string,
  ): Promise<{ processed: number; success: number; failed: number }> {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let batch: VariantBatchItem[] = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    this.logger.log(`Starting to process variants file: ${filePath}`);

    try {
      for await (const { data, rowNumber } of this.csvParserService.parseStream(fileStream)) {
        try {
          const productSlug = (data.product_slug || '').trim();
          const sku = (data.sku || '').trim();
          const price = parseFloat(String(data.price || '0'));
          const stock = parseInt(String(data.stock || '0'), 10);

          this.logger.debug(`Processing variants row ${rowNumber}: ${JSON.stringify(data)}`);

          if (!productSlug && !sku && !data.price && !data.stock && Object.keys(data).length <= 2) {
            this.logger.debug(`Skipping empty variants row ${rowNumber}`);
            continue;
          }

          processedCount++;

          if (!productSlug || !sku) {
            await this.recordError(jobId, rowNumber, sku, 'Missing required fields: product_slug, sku', data, 'variants.csv');
            errorCount++;
            continue;
          }

          const product = context.productMap[productSlug];
          if (!product) {
            await this.recordError(jobId, rowNumber, sku, `Product not found: ${productSlug}`, data, 'variants.csv');
            errorCount++;
            continue;
          }

          const attributes = this.extractAttributes(data);

          batch.push({
            productId: product.id,
            sku,
            name: `${product.name} - ${sku}`,
            price: Math.round(price * 100),
            stock,
            attributes,
          });

          if (batch.length >= this.batchSize) {
            const batchSuccess = await this.processVariantBatch(batch, context, jobId);
            successCount += batchSuccess;
            errorCount += batch.length - batchSuccess;
            batch = [];
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.recordError(jobId, rowNumber, String(data.sku || ''), errorMessage, data, 'variants.csv');
          errorCount++;
        }
      }

      if (batch.length > 0) {
        const batchSuccess = await this.processVariantBatch(batch, context, jobId);
        successCount += batchSuccess;
        errorCount += batch.length - batchSuccess;
      }

      this.logger.log(`Variants import complete: ${processedCount} processed, ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing variants.csv: ${errorMessage}`);
    }

    return { processed: processedCount, success: successCount, failed: errorCount };
  }

  /**
   * Process a batch of variants. Returns the number of successfully created variants.
   */
  private async processVariantBatch(batch: VariantBatchItem[], context: ImportContext, _jobId: string): Promise<number> {
    let successCount = 0;

    await this.db.$transaction(async (prisma) => {
      for (const item of batch) {
        try {
          // Check if variant already exists
          const existingVariant = await prisma.productVariant.findUnique({
            where: { sku: item.sku },
          });

          let variant;
          if (existingVariant) {
            // Update existing variant
            variant = await prisma.productVariant.update({
              where: { id: existingVariant.id },
              data: {
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.stock,
                attributes: item.attributes as any,
              },
            });
            this.logger.debug(`Updated existing variant: ${item.sku}`);
          } else {
            // Create new variant
            variant = await prisma.productVariant.create({
              data: {
                productId: item.productId,
                sku: item.sku,
                name: item.name,
                price: item.price,
                quantity: item.stock,
                attributes: item.attributes as any,
              },
            });
            this.logger.debug(`Created new variant: ${item.sku}`);
          }

          // Delete existing attribute values for this variant if updating
          if (existingVariant) {
            await prisma.variantAttributeValue.deleteMany({
              where: { variantId: variant.id },
            });
          }

          // Create/update attribute values
          for (const [attrSlug, value] of Object.entries(item.attributes)) {
            const attribute = context.attributeMap[attrSlug];
            if (!attribute) {
              const newAttr = await prisma.attributeDefinition.upsert({
                where: { slug: attrSlug },
                update: {},
                create: {
                  slug: attrSlug,
                  name: attrSlug,
                  dataType: 'text',
                  isRequired: false,
                  isFilterable: true,
                },
              });

              context.attributeMap[attrSlug] = {
                id: newAttr.id,
                name: newAttr.name,
                dataType: newAttr.dataType,
              };

              await this.createAttributeValue(prisma, variant.id, newAttr.id, value as string);
            } else {
              await this.createAttributeValue(prisma, variant.id, attribute.id, value as string, attribute.dataType);
            }
          }

          successCount++;
          this.logger.debug(`Imported variant: ${item.sku}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to import variant ${item.sku}: ${errorMessage}`);
        }
      }
    });

    return successCount;
  }

  /**
   * Create attribute value based on data type
   */
  private async createAttributeValue(
    prisma: any,
    variantId: string,
    attributeId: string,
    value: string,
    dataType?: string,
  ): Promise<void> {
    const data: any = {
      variantId,
      attributeId,
    };

    if (dataType === 'number') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        data.numberValue = numValue;
      }
    } else if (dataType === 'boolean') {
      data.booleanValue = value.toLowerCase() === 'true';
    } else {
      data.textValue = value;
    }

    await prisma.variantAttributeValue.create({ data });
  }

  /**
   * Extract dynamic attributes from CSV row (excluding system fields)
   */
  private extractAttributes(data: CsvRowExtended): Record<string, string> {
    const attributes: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      if (!SYSTEM_FIELDS.includes(key) && value !== null && value !== undefined && value !== '') {
        attributes[key] = String(value);
      }
    }

    return attributes;
  }

  /**
   * Step 4: Import images from CSV
   */
  private async step4_importImages(filePath: string, jobId: string): Promise<void> {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });

    try {
      // Collect all image URLs first
      const imageUrls: Array<{ sku: string; imageUrl: string }> = [];

      for await (const { data } of this.csvParserService.parseStream(fileStream)) {
        const sku = (data.sku || '').trim();
        const imageUrl = (data.image_url || '').trim();

        // Skip empty rows
        if (!sku && !imageUrl) {
          continue;
        }

        if (!sku || !imageUrl) {
          await this.recordError(jobId, 0, sku, 'Missing required fields: sku, image_url', data, 'images.csv');
          continue;
        }

        const variant = await this.db.productVariant.findUnique({
          where: { sku },
        });

        if (!variant) {
          await this.recordError(jobId, 0, sku, `Variant not found: ${sku}`, data, 'images.csv');
          continue;
        }

        imageUrls.push({ sku, imageUrl });
      }

      // Batch download images using ImageImportService
      this.logger.log(`Downloading ${imageUrls.length} images in batches`);
      const downloadedImages = await this.imageImportService.batchDownloadAndStore(
        imageUrls.map((item) => ({ sku: item.sku, imageUrl: item.imageUrl })),
        5, // Concurrency of 5
      );

      // Create ProductImage records for successfully downloaded images
      for (const image of downloadedImages) {
        const variant = await this.db.productVariant.findUnique({
          where: { sku: image.sku },
        });

        if (variant) {
          await this.db.productImage.create({
            data: {
              variantId: variant.id,
              url: image.storedUrl,
              altText: `${variant.name}`,
              sortOrder: 0,
            },
          });

          this.logger.debug(`Imported image for variant: ${image.sku}`);
        }
      }

      const failedCount = imageUrls.length - downloadedImages.length;
      if (failedCount > 0) {
        this.logger.warn(`Failed to download ${failedCount} images`);
      }

      this.logger.log(`Image import complete: ${downloadedImages.length} succeeded, ${failedCount} failed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing images.csv: ${errorMessage}`);
    }
  }

  /**
   * Step 5: Update search index
   */
  private async step5_updateSearchIndex(jobId: string): Promise<void> {
    // TODO: Integrate with Meilisearch IndexerService
    // For now, emit event to trigger search indexing
    this.eventEmitter.emit('import.catalog.completed', { jobId });
    this.logger.log('Search index update queued');
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
}
