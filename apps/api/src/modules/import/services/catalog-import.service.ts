import { Injectable, Logger } from '@nestjs/common';
import { DatabaseProvider } from '@core/database';
import { CsvParserService } from './csv-parser.service';
import { ImportJobService } from './import-job.service';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { ExtractedFiles } from '../dto';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImageImportService } from './image-import.service';
import { createHash } from 'crypto';
import { StorageService } from '../../storage/storage.service';

const SYSTEM_FIELDS = ['product_sku', 'sku', 'price', 'stock'];

/**
 * Generate a unique SKU in the format: P-{8 random alphanumeric chars}
 */
function generateProductSku(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `P-${result}`;
}

/**
 * Generate variant SKU from product SKU and attribute values
 * Format: {product_sku}-{attr1}-{attr2}-{attr3}
 */
function generateVariantSku(productSku: string, attributes: Record<string, string>): string {
  const attrKeys = Object.keys(attributes).sort();
  const attrValues = attrKeys.map(key => attributes[key]).filter(Boolean);
  
  // Hash the attribute values to create a consistent short string
  const attrString = attrValues.join('-');
  const hash = createHash('md5').update(attrString).digest('hex').substring(0, 4).toUpperCase();
  
  return `${productSku}-${hash}`;
}

/**
 * Generate a slug from product name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ProductMap {
  [slug: string]: { id: string; name: string; cellSlug: string; userSku?: string };
}

export interface AttributeMap {
  [slug: string]: { id: string; name: string; dataType: string };
}

export interface ImportContext {
  jobId: string;
  productMap: ProductMap;
  attributeMap: AttributeMap;
  importMode?: string;
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
  private tempFiles: string[] = [];

  constructor(
    private readonly db: DatabaseProvider,
    private readonly csvParserService: CsvParserService,
    private readonly importJobService: ImportJobService,
    private readonly importErrorRepository: ImportErrorRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly imageImportService: ImageImportService,
    private readonly storageService: StorageService,
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

      // Get import mode from job
      const job = await this.importJobService.findById(jobId);
      const importMode = job.mode || 'UPSERT';
      this.logger.log(`Import mode: ${importMode}`);

      const context: ImportContext = {
        jobId,
        productMap: {},
        attributeMap: {},
        importMode,
      };

      // Step 1: Import products (if provided)
      if (extractedFiles.products) {
        this.logger.log(`Step 1: Importing products from ${extractedFiles.products}`);
        const result = await this.step1_importProducts(extractedFiles.products, jobId);
        context.productMap = result.productMap;
        this.logger.log(`Products step: ${result.success} success, ${result.failed} failed`);
      } else {
        // If no products.csv, load existing products from database for variant lookup
        this.logger.log(`Step 1: Loading existing products from database for variant import`);
        context.productMap = await this.loadExistingProducts();
        this.logger.log(`Loaded ${Object.keys(context.productMap).length} existing products from database`);
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
    } finally {
      // Clean up temp files
      await this.cleanupTempFiles();
    }
  }

  /**
   * Count total data rows in the variants CSV (the primary import entity).
   * Products/attributes are supporting data; variants represent the actual items imported.
   */
  private async countTotalRows(extractedFiles: ExtractedFiles): Promise<number> {
    if (!extractedFiles.variants) {
      return 0;
    }

    // Download if URL
    const { localPath } = await this.downloadIfUrl(extractedFiles.variants);

    if (!fs.existsSync(localPath)) {
      return 0;
    }
    const stream = fs.createReadStream(localPath, { encoding: 'utf8' });
    return this.csvParserService.countRows(stream);
  }

  /**
   * Load existing products from database for variant import
   */
  private async loadExistingProducts(): Promise<ProductMap> {
    const productMap: ProductMap = {};

    const products = await this.db.product.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        sku: true,
        metadata: true,
        cell: {
          select: {
            slug: true,
          },
        },
      },
    });

    for (const product of products) {
      const entry: ProductMap[string] = {
        id: product.id,
        name: product.name,
        cellSlug: product.cell?.slug || '',
      };

      // Index by slug
      productMap[product.slug] = entry;

      // Index by auto-generated SKU (P-XXXXXXXX format)
      if (product.sku) {
        productMap[product.sku] = entry;
      }

      // Index by user SKU from metadata (the SKU users provide in CSV)
      const userSku = product.metadata?.userSku as string | undefined;
      if (userSku) {
        entry.userSku = userSku;
        productMap[userSku] = entry;
      }
    }

    return productMap;
  }

  /**
   * Process a standalone variants CSV (not from a ZIP).
   * Used by ImportProcessorService when a single CSV with product_sku is uploaded.
   */
  async processStandaloneVariantsCsv(
    jobId: string,
    fileBuffer: Buffer,
  ): Promise<{ processed: number; success: number; failed: number }> {
    this.logger.log(`Processing standalone variants CSV for job: ${jobId}`);

    const job = await this.importJobService.findById(jobId);
    const importMode = job.mode || 'UPSERT';

    const context: ImportContext = {
      jobId,
      productMap: await this.loadExistingProducts(),
      attributeMap: {},
      importMode,
    };

    this.logger.log(`Loaded ${Object.keys(context.productMap).length} existing products from database`);

    // Write buffer to temp file and process it
    const tempDir = path.join(process.cwd(), 'uploads', 'import', 'temp');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `${Date.now()}-standalone-variants.csv`);
    await fs.promises.writeFile(tempFilePath, fileBuffer);
    this.tempFiles.push(tempFilePath);

    const result = await this.step3_importVariants(tempFilePath, context, jobId);

    await this.importJobService.updateProgress(jobId, {
      processedRows: result.processed,
      successRows: result.success,
      failedRows: result.failed,
    });

    this.logger.log(
      `Standalone variants import complete: ${result.success} success, ${result.failed} failed out of ${result.processed}`,
    );

    return result;
  }

  /**
   * Step 1: Import products from CSV
   */
  private async step1_importProducts(
    filePath: string,
    jobId: string,
  ): Promise<{ productMap: ProductMap; processed: number; success: number; failed: number }> {
    // Download if URL
    const { localPath } = await this.downloadIfUrl(filePath);

    const productMap: ProductMap = {};
    const fileStream = fs.createReadStream(localPath, { encoding: 'utf8' });
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    // Get import mode from context (will be passed via context in real usage)
    const job = await this.importJobService.findById(jobId);
    const importMode = job.mode || 'UPSERT';

    this.logger.log(`Starting to process products file: ${filePath}, import mode: ${importMode}`);

    try {
      for await (const { data, rowNumber } of this.csvParserService.parseStream(fileStream)) {
        try {
          const productSku = (data.product_sku || '').trim();
          const productName = (data.product_name || '').trim();
          const productSlug = (data.product_slug || '').trim();
          const cellSlug = (data.cell_slug || '').trim();
          const description = (data.description || '').trim();

          this.logger.debug(`Processing products row ${rowNumber}: ${JSON.stringify(data)}`);

          if (!productSku && !productName && !cellSlug && !description) {
            this.logger.debug(`Skipping empty row ${rowNumber}`);
            continue;
          }

          processedCount++;

          if (!productSku || !productName) {
            await this.recordError(jobId, rowNumber, null, 'Missing required fields: product_sku, product_name', data, 'products.csv');
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
                await this.recordError(jobId, rowNumber, productSku, `Cell not found and cannot create: ${cellSlug}`, data, 'products.csv');
                errorCount++;
                continue;
              }
            }
          }

          // Check if product already exists
          let existingProduct = await this.db.product.findFirst({
            where: {
              metadata: {
                path: ['userSku'],
                equals: productSku,
              },
            },
          });

          // Also check by internal SKU if not found via metadata
          if (!existingProduct) {
            existingProduct = await this.db.product.findFirst({
              where: { sku: productSku },
            });
          }

          // Respect import mode
          if (importMode === 'CREATE_ONLY' && existingProduct) {
            await this.recordError(jobId, rowNumber, productSku, `Product already exists: ${productSku} (CREATE_ONLY mode)`, data, 'products.csv');
            errorCount++;
            continue;
          }

          if (importMode === 'UPDATE_ONLY' && !existingProduct) {
            await this.recordError(jobId, rowNumber, productSku, `Product not found: ${productSku} (UPDATE_ONLY mode)`, data, 'products.csv');
            errorCount++;
            continue;
          }

          // Auto-generate unique SKU and slug
          const autoSku = generateProductSku();
          const slug = productSlug || generateSlug(productName);

          // Collect table column headers (at_head1-15)
          const tableColumns: Array<{ attributeId: string; position: number }> = [];
          let hasInvalidAttrSlug = false;
          for (let i = 1; i <= 15; i++) {
            const attrSlug = data[`at_head${i}`]?.trim();
            if (attrSlug) {
              const attribute = await this.db.attributeDefinition.findUnique({
                where: { slug: attrSlug },
              });
              if (attribute) {
                tableColumns.push({
                  attributeId: attribute.id,
                  position: i,
                });
              } else {
                this.logger.warn(`Attribute not found for column at_head${i}: ${attrSlug}`);
                await this.recordError(jobId, rowNumber, productSku, `Unknown attribute slug "${attrSlug}" in at_head${i}. Attribute must exist before importing.`, data, 'products.csv');
                hasInvalidAttrSlug = true;
              }
            }
          }
          if (hasInvalidAttrSlug) {
            errorCount++;
            continue;
          }

          let product;
          if (existingProduct && importMode !== 'CREATE_ONLY') {
            // Update existing product (UPSERT or UPDATE_ONLY)
            product = await this.db.product.update({
              where: { id: existingProduct.id },
              data: {
                name: productName,
                cellId: cellId,
                ...(productSlug ? { slug: productSlug } : {}),
                description: description || existingProduct.description,
              },
            });
            this.logger.log(`Updated existing product: ${productSku} (internal SKU: ${product.sku}), mode: ${importMode}`);
          } else if (!existingProduct && importMode !== 'UPDATE_ONLY') {
            // Create new product with auto-generated SKU (UPSERT or CREATE_ONLY)
            product = await this.db.product.create({
              data: {
                sku: autoSku,
                slug,
                name: productName,
                cellId: cellId,
                description: description || null,
                type: 'variable',
                status: 'active',
                metadata: {
                  userSku: productSku,
                },
              },
            });
            this.logger.log(`Created new product: ${productSku} (auto SKU: ${autoSku}), mode: ${importMode}`);
          } else {
            // Should not reach here due to earlier checks, but handle gracefully
            continue;
          }

          // Create/update table column associations
          if (tableColumns.length > 0) {
            await this.db.$transaction(async (prisma) => {
              // Delete existing table columns for this product
              await prisma.productTableColumn.deleteMany({
                where: { productId: product.id },
              });

              // Create new table column associations
              for (const column of tableColumns) {
                await prisma.productTableColumn.create({
                  data: {
                    productId: product.id,
                    ...column,
                  },
                });
              }
            });
          }

          productMap[productSku] = {
            id: product.id,
            name: product.name,
            cellSlug,
            userSku: productSku,
          };

          successCount++;
          this.logger.debug(`Imported product: ${productSku}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.recordError(jobId, rowNumber, String(data.product_sku || ''), errorMessage, data, 'products.csv');
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
    // Download if URL
    const { localPath } = await this.downloadIfUrl(filePath);

    const attributeMap: AttributeMap = {};
    const fileStream = fs.createReadStream(localPath, { encoding: 'utf8' });

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
    // Download if URL
    const { localPath } = await this.downloadIfUrl(filePath);

    const fileStream = fs.createReadStream(localPath, { encoding: 'utf8' });
    let batch: VariantBatchItem[] = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    this.logger.log(`Starting to process variants file: ${filePath}`);

    try {
      for await (const { data, rowNumber } of this.csvParserService.parseStream(fileStream)) {
        try {
          const productSku = (data.product_sku || '').trim();
          const priceRaw = String(data.price || '0').trim().replace(/[^0-9.\-]/g, '');
          const price = parseFloat(priceRaw);
          const stock = parseInt(String(data.stock || '0'), 10);

          this.logger.debug(`Processing variants row ${rowNumber}: ${JSON.stringify(data)}`);

          if (!productSku && !data.price && !data.stock && Object.keys(data).length <= 2) {
            this.logger.debug(`Skipping empty variants row ${rowNumber}`);
            continue;
          }

          processedCount++;

          if (!productSku) {
            await this.recordError(jobId, rowNumber, '', 'Missing required field: product_sku', data, 'variants.csv');
            errorCount++;
            continue;
          }

          const product = context.productMap[productSku];
          if (!product) {
            await this.recordError(jobId, rowNumber, '', `Product not found: ${productSku}`, data, 'variants.csv');
            errorCount++;
            continue;
          }

          const attributes = this.extractAttributes(data);
          
          // Auto-generate variant SKU from product SKU and attribute values
          const productSkuInternal = product.userSku || productSku;
          const variantSku = generateVariantSku(productSkuInternal, attributes);
          const variantName = `${product.name} - ${variantSku}`;

          batch.push({
            productId: product.id,
            sku: variantSku,
            name: variantName,
            price,
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
      const categoryAttributePairs = new Set<string>();

      for (const item of batch) {
        try {
          // Check if variant already exists
          const existingVariant = await prisma.productVariant.findUnique({
            where: { sku: item.sku },
          });

          // Respect import mode
          if (context.importMode === 'CREATE_ONLY' && existingVariant) {
            this.logger.warn(`Skipping variant ${item.sku} - already exists in CREATE_ONLY mode`);
            continue;
          }

          if (context.importMode === 'UPDATE_ONLY' && !existingVariant) {
            this.logger.warn(`Skipping variant ${item.sku} - does not exist in UPDATE_ONLY mode`);
            continue;
          }

          let variant;
          if (existingVariant && context.importMode !== 'CREATE_ONLY') {
            // Update existing variant (UPSERT or UPDATE_ONLY)
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
            this.logger.debug(`Updated existing variant: ${item.sku}, mode: ${context.importMode}`);
          } else if (!existingVariant && context.importMode !== 'UPDATE_ONLY') {
            // Create new variant (UPSERT or CREATE_ONLY)
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
            this.logger.debug(`Created new variant: ${item.sku}, mode: ${context.importMode}`);
          } else {
            // Skipped due to import mode
            continue;
          }

          // Delete existing attribute values for this variant if updating
          if (existingVariant && context.importMode !== 'CREATE_ONLY') {
            await prisma.variantAttributeValue.deleteMany({
              where: { variantId: variant.id },
            });
          }

          // Create/update attribute values for each dynamic column header
          for (const [attrSlug, value] of Object.entries(item.attributes)) {
            let attribute = context.attributeMap[attrSlug];
            
            if (!attribute) {
              // Look up attribute by slug if not in cache
              const attr = await prisma.attributeDefinition.findUnique({
                where: { slug: attrSlug },
              });
              
              if (attr) {
                attribute = {
                  id: attr.id,
                  name: attr.name,
                  dataType: attr.dataType,
                };
                context.attributeMap[attrSlug] = attribute;
              } else {
                this.logger.error(`Unknown attribute slug "${attrSlug}" for variant ${item.sku}. Skipping attribute value.`);
                continue;
              }
            }

            // Handle special values: empty string, "-"
            let finalValue: string;
            if (value === '') {
              finalValue = '';
            } else if (value === '-') {
              finalValue = '';
            } else {
              finalValue = value as string;
            }

            // Skip if value is empty after processing
            if (!finalValue) {
              continue;
            }

            await this.createAttributeValue(prisma, variant.id, attribute.id, finalValue, attribute.dataType);
            categoryAttributePairs.add(attribute.id);
          }

          successCount++;
          this.logger.debug(`Imported variant: ${item.sku}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to import variant ${item.sku}: ${errorMessage}`);
        }
      }

      // Auto-create category_attribute links for all attributes used in this batch
      if (categoryAttributePairs.size > 0) {
        const productIds = [...new Set(batch.map((item) => item.productId))];
        const productsWithCategory = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            cell: { select: { categoryId: true } },
          },
        });

        const productIdToCategoryId = new Map<string, string>();
        for (const p of productsWithCategory) {
          if (p.cell?.categoryId) {
            productIdToCategoryId.set(p.id, p.cell.categoryId);
          }
        }

        const categoryIds = [...new Set(productIdToCategoryId.values())];
        const attributeIds = [...categoryAttributePairs];

        for (const categoryId of categoryIds) {
          for (const attributeId of attributeIds) {
            await prisma.categoryAttribute.upsert({
              where: {
                categoryId_attributeId: { categoryId, attributeId },
              },
              create: { categoryId, attributeId },
              update: {},
            });
          }
        }

        this.logger.log(
          `Created/verified ${categoryIds.length * attributeIds.length} category-attribute links across ${categoryIds.length} categories`,
        );
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
    const rawValue = value.trim();
    const data: any = {
      variantId,
      attributeId,
      rawValue,
    };

    if (dataType === 'number') {
      const numericValue = this.parseMeasurement(rawValue);
      if (numericValue !== null) {
        data.numberValue = numericValue;
      }
    } else if (dataType === 'boolean') {
      data.booleanValue = rawValue.toLowerCase() === 'true';
    } else {
      data.textValue = rawValue;
    }

    await prisma.variantAttributeValue.create({ data });
  }

  /**
   * Parse measurement strings like "3/4", "1-1/2", "2.5" into numeric values
   */
  private parseMeasurement(value: string): number | null {
    if (!value || value.trim() === '') return null;

    // Strip trailing unit symbols to expose the numeric portion
    const cleanValue = value.trim()
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
    // Download if URL
    const { localPath } = await this.downloadIfUrl(filePath);

    const fileStream = fs.createReadStream(localPath, { encoding: 'utf8' });

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
  private async downloadIfUrl(filePath: string): Promise<{ localPath: string; isTemp: boolean }> {
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
}
