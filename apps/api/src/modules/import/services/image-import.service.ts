import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import unzipper from 'unzipper';
import pLimit from 'p-limit';
import { Readable } from 'stream';
import { StorageService } from '@modules/storage/storage.service';
import { VariantImageRepository } from '@modules/catalog/repositories/variant-image.repository';
import { ProductImageRepository } from '@modules/catalog/repositories/product-image.repository';
import { ProductVariantRepository } from '@modules/catalog/repositories/product-variant.repository';
import { ProductRepository } from '@modules/catalog/repositories/product.repository';
import { CategoryRepository } from '@modules/catalog/repositories/category.repository';
import { CategoryImageRepository } from '@modules/catalog/repositories/category-image.repository';
import { CellRepository } from '@modules/cell/repositories/cell.repository';
import { CellImageRepository } from '@modules/cell/repositories/cell-image.repository';
import * as crypto from 'crypto';

export type ImageMappingType = 'sku' | 'cell_sku' | 'product' | 'category';

export enum ImageUploadStrategy {
  SKIP = 'skip',
  REPLACE = 'replace',
}

export interface ImportedImage {
  sku: string;
  originalUrl: string;
  storedUrl: string;
  fileName: string;
}

export interface ProcessedImage {
  sku?: string;
  position: number;
  ext: string;
  variantId?: string;
  storagePath?: string;
  mappingType: ImageMappingType;
  cellId?: string;
  productId?: string;
  categoryId?: string;
  imageUrl?: string;
}

@Injectable()
export class ImageImportService {
  private readonly logger = new Logger(ImageImportService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'import', 'images');
  private readonly maxRetries = 3;
  private readonly timeout = 30000; // 30 seconds
  private readonly concurrencyLimit = 10;

  constructor(
    private readonly storageService: StorageService,
    private readonly variantImageRepository: VariantImageRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly categoryImageRepository: CategoryImageRepository,
    private readonly cellRepository: CellRepository,
    private readonly cellImageRepository: CellImageRepository,
  ) {
    this.ensureUploadDirectory();
  }

  /**
   * Download image from URL and store it
   */
  async downloadAndStore(imageUrl: string, sku: string): Promise<ImportedImage> {
    this.logger.log(`Downloading image for SKU ${sku}: ${imageUrl}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const { data, headers } = await axios.get<ArrayBuffer>(imageUrl, {
          responseType: 'arraybuffer',
          timeout: this.timeout,
          headers: {
            'User-Agent': 'DynamicHub Catalog Import/1.0',
          },
        });

        const contentType = headers['content-type'] || 'image/jpeg';
        const fileExtension = this.getExtensionFromContentType(contentType);
        const fileName = `${sku}-${uuidv4()}.${fileExtension}`;
        const filePath = path.join(this.uploadDir, fileName);
        const storedUrl = `/uploads/import/images/${fileName}`;

        // Save image to local filesystem
        fs.writeFileSync(filePath, Buffer.from(data));

        this.logger.debug(
          `Image downloaded: ${fileName} (${data.byteLength} bytes)`,
        );

        const importedImage: ImportedImage = {
          sku,
          originalUrl: imageUrl,
          storedUrl,
          fileName,
        };

        return importedImage;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          `Attempt ${attempt}/${this.maxRetries} failed to download image for SKU ${sku}: ${lastError.message}`,
        );

        if (attempt < this.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to download image for SKU ${sku} after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Batch download and store images
   */
  async batchDownloadAndStore(images: Array<{ sku: string; imageUrl: string }>, concurrency = 5): Promise<ImportedImage[]> {
    const results: ImportedImage[] = [];
    const errors: Array<{ sku: string; error: string }> = [];

    // Process in batches to avoid overwhelming external servers
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(async ({ sku, imageUrl }) => {
        try {
          const image = await this.downloadAndStore(imageUrl, sku);
          results.push(image);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to download image for SKU ${sku}: ${errorMessage}`);
          errors.push({ sku, error: errorMessage });
        }
      });

      await Promise.all(batchPromises);
      this.logger.debug(
        `Batch ${Math.floor(i / concurrency) + 1}: ${results.length} downloaded, ${errors.length} failed`,
      );

      // Small delay between batches
      if (i + concurrency < images.length) {
        await this.sleep(500);
      }
    }

    this.logger.log(
      `Batch download complete: ${results.length} succeeded, ${errors.length} failed`,
    );

    if (errors.length > 0) {
      this.logger.warn(
        `Failed to download ${errors.length} images: ${errors.map((e) => e.sku).join(', ')}`,
      );
    }

    return results;
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const mapping: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
    };

    const normalizedType = contentType.toLowerCase().split(';')[0].trim();
    return mapping[normalizedType] || 'jpg';
  }

  /**
   * Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.debug(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Process image ZIP file using pure streaming with backpressure control
   * Uses unzipper.Parse() for streaming with pLimit for concurrency
   */
  async processImageZip(
    zipStream: Readable,
    strategy: ImageUploadStrategy = ImageUploadStrategy.REPLACE
  ): Promise<{
    processed: ProcessedImage[];
    skipped: Array<{ sku: string; reason: string }>;
    total: number;
  }> {
    this.logger.log(`[ImageImport] Starting streaming ZIP processing, strategy: ${strategy}`);
    const results: ProcessedImage[] = [];
    const skipped: Array<{ sku: string; reason: string }> = [];

    // Preload all maps ONCE at the start for O(1) lookups
    this.logger.log(`[ImageImport] Preloading SKU, category, cell SKU, and product maps from database...`);
    const [skuMap, categoryMap, categorySlugMap, cellSkuMap, productMap, productSkuMap] = await Promise.all([
      this.productVariantRepository.getSkuMap(),
      this.categoryRepository.getSkuMap(),
      this.categoryRepository.getSlugMap(),
      this.cellRepository.getSkuMap(),
      this.productRepository.getSlugMap(),
      this.productRepository.getSkuMap(),
    ]);
    this.logger.log(`[ImageImport] Loaded ${skuMap.size} variant SKUs, ${categoryMap.size} category SKUs, ${categorySlugMap.size} category slugs, ${cellSkuMap.size} cell SKUs, ${productMap.size} product slugs, ${productSkuMap.size} product SKUs for image processing`);

    // Set up concurrency limiter with backpressure threshold
    const limit = pLimit(this.concurrencyLimit);
    const backpressureThreshold = 20; // Higher than concurrency to avoid micro-stalls

    const uploadPromises: Promise<void>[] = [];
    let processedCount = 0;
    const processedVariants = new Set<string>();
    const processedProducts = new Set<string>();

    // Process ZIP stream using unzipper.Parse() with backpressure
    return new Promise((resolve, reject) => {
      zipStream.pipe(unzipper.Parse())
        .on('entry', async (entry: unzipper.Entry) => {
          // SYNC: Check directory - drain immediately
          if (entry.type === 'Directory') {
            entry.autodrain();
            return;
          }

          // SYNC: Check valid image file - drain if not
          if (!this.isValidImageFile(entry.path)) {
            entry.autodrain();
            return;
          }

          // SYNC: Parse filename and lookup SKU
          const filename = path.basename(entry.path);
          const { sku, fullSku, position, ext, hasPositionSuffix } = this.parseImageFilename(filename);

          let lookupSku = fullSku;
          let finalPosition = 1;

          let variantId = skuMap.get(fullSku);
          let categoryId = categoryMap.get(fullSku) || categorySlugMap.get(fullSku);
          let cellId = cellSkuMap.get(fullSku);
          let productId = productSkuMap.get(fullSku) || productMap.get(fullSku);

          if (!variantId && !categoryId && !cellId && !productId && hasPositionSuffix) {
            lookupSku = sku;
            finalPosition = position;
            variantId = skuMap.get(sku);
            categoryId = categoryMap.get(sku) || categorySlugMap.get(sku);
            cellId = cellSkuMap.get(sku);
            productId = productSkuMap.get(sku) || productMap.get(sku);
          }

          const effectivePosition = finalPosition;

          // SYNC: Check if SKU not found - drain and skip
          if (!variantId && !categoryId && !cellId && !productId) {
            entry.autodrain();
            this.logger.warn(`[ImageImport] SKU not found: ${lookupSku} (filename: ${filename})`);
            skipped.push({ sku: lookupSku, reason: 'SKU not found in database' });
            return;
          }

          // SYNC: Backpressure check - pause if queue is saturated
          if (limit.activeCount + limit.pendingCount >= backpressureThreshold) {
            zipStream.pause();
          }

          // Push async work to queue with resume in finally
          const task = limit(async () => {
            try {
              // Handle variant image
              if (variantId) {
                this.logger.log(`[ImageImport] Found variantId ${variantId} for SKU ${lookupSku} (position: ${effectivePosition})`);

                if (strategy === ImageUploadStrategy.SKIP) {
                  const existing = await this.variantImageRepository.findBySkuAndPosition(lookupSku, effectivePosition);
                  if (existing) {
                    entry.autodrain();
                    this.logger.log(`[ImageImport] Skipping existing variant image: SKU=${lookupSku}, position=${effectivePosition}`);
                    skipped.push({ sku: lookupSku, reason: 'Existing image at same position' });
                    return;
                  }
                }

                // Upload stream directly to SeaweedFS
                const storagePath = this.generateStoragePath(lookupSku, effectivePosition, ext);
                await this.storageService.uploadStream(storagePath, entry, this.getContentType(ext));

                const created = await this.variantImageRepository.upsert(
                  variantId,
                  effectivePosition,
                  storagePath,
                  lookupSku
                );

                this.logger.log(`[ImageImport] Created/updated variant image: id=${created.id}, variantId=${variantId}, sku=${lookupSku}, position=${effectivePosition}`);

                results.push({
                  sku: lookupSku,
                  position: effectivePosition,
                  ext,
                  variantId,
                  storagePath,
                  mappingType: 'sku',
                });

                processedVariants.add(variantId);
              } else if (categoryId) {
                // Process category image with streaming
                const result = await this.processCategoryImageStream(
                  entry,
                  lookupSku,
                  effectivePosition,
                  ext,
                  categoryMap,
                  categorySlugMap,
                  strategy,
                  skipped
                );
                if (result) {
                  results.push(result);
                }
              } else if (cellId) {
                // Process cell image with streaming
                const result = await this.processCellImageStream(
                  entry,
                  lookupSku,
                  effectivePosition,
                  ext,
                  cellSkuMap,
                  strategy,
                  skipped
                );
                if (result) {
                  results.push(result);
                }
              } else if (productId) {
                // Process product image with streaming
                const result = await this.processProductImageStream(
                  entry,
                  lookupSku,
                  effectivePosition,
                  ext,
                  productMap,
                  productSkuMap,
                  strategy,
                  skipped
                );
                if (result) {
                  results.push(result);
                  if (result.productId) {
                    processedProducts.add(result.productId);
                  }
                }
              }

              processedCount++;
              if (processedCount % 10 === 0) {
                this.logger.log(`[ImageImport] Progress: ${processedCount} images processed`);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.error(`[ImageImport] Failed to process ${entry.path}: ${errorMessage}`);
              // Drain entry on error
              entry.autodrain();
            }
          }).finally(() => {
            // Resume ZIP stream when slot frees up
            zipStream.resume();
          });

          uploadPromises.push(task);
        })
        .on('finish', async () => {
          // Wait for all upload promises to complete
          await Promise.all(uploadPromises);

          // Ensure each variant has a primary image
          this.logger.log(`[ImageImport] Ensuring primary image for ${processedVariants.size} variants`);
          for (const variantId of processedVariants) {
            await this.ensurePrimaryImage(variantId);
          }

          this.logger.log(`[ImageImport] ZIP processing complete: ${results.length} images processed, ${skipped.length} skipped`);
          resolve({
            processed: results,
            skipped,
            total: results.length + skipped.length,
          });
        })
        .on('error', (error: Error) => {
          this.logger.error(`[ImageImport] ZIP stream error: ${error.message}`);
          reject(error);
        });
    });
  }

  /**
   * Parse image filename to extract SKU and position
   * Supports formats:
   * - SKU.ext (no position, defaults to 1)
   * - SKU-POSITION.ext
   * - SKU(POSITION).ext
   * - SKU (POSITION).ext (with space)
   *
   * Returns both fullSku (entire filename without extension) and parsed sku/position
   * for fallback lookup when the full SKU doesn't match.
   */
  parseImageFilename(filename: string): { sku: string; fullSku: string; position: number; ext: string; hasPositionSuffix: boolean } {
    // Normalize (remove spaces)
    filename = filename.replace(/\s+/g, "");

    // Extract extension first
    const extMatch = filename.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    if (!extMatch) {
      throw new Error(`Invalid filename format: ${filename}`);
    }
    const ext = extMatch[1].toLowerCase();
    const fullSku = filename.substring(0, filename.length - extMatch[0].length);

    // Check for position suffix: -DIGITS or (DIGITS) at the end
    const positionMatch = fullSku.match(/^(.+?)(?:-(\d+)|\((\d+)\))$/);

    if (positionMatch) {
      const sku = positionMatch[1];
      const position = parseInt(positionMatch[2] || positionMatch[3], 10);
      return { sku, fullSku, position, ext, hasPositionSuffix: true };
    }

    // No position suffix found - use full SKU with default position 1
    return { sku: fullSku, fullSku, position: 1, ext, hasPositionSuffix: false };
  }

  /**
   * Generate storage path with hash-based prefix
   */
  generateStoragePath(sku: string, position: number, ext: string): string {
    const prefix = this.getImagePrefix(sku);
    return `/product-images/${prefix}/${sku}-${position}.${ext}`;
  }

  /**
   * Generate hash-based prefix for SKU
   */
  getImagePrefix(sku: string): string {
    return crypto
      .createHash("md5")
      .update(sku) // FULL SKU, not first 3 chars
      .digest("hex")
      .substring(0, 4);
  }

  /**
   * Ensure variant has a primary image
   */
  async ensurePrimaryImage(variantId: string): Promise<void> {
    const images = await this.variantImageRepository.findByVariantId(variantId);

    // If no images, nothing to do
    if (images.length === 0) return;

    // Check if any image is already primary
    const hasPrimary = images.some(img => img.isPrimary);

    if (!hasPrimary) {
      // Set the lowest position as primary
      const lowestPosition = images.reduce((min, img) =>
        img.position < min.position ? img : min
      );

      await this.variantImageRepository.update(lowestPosition.id, {
        isPrimary: true
      });
    }
  }

  /**
   * Check if file is a valid image
   */
  private isValidImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const isValid = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    this.logger.debug(`[ImageImport] Image validation: path="${filePath}", ext="${ext}", valid=${isValid}`);
    return isValid;
  }

  /**
   * Get content type from extension
   */
  private getContentType(ext: string): string {
    const mapping: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    return mapping[ext] || 'image/jpeg';
  }

  // ========== STREAMING HELPER METHODS ==========

  /**
   * Process category image from ZIP entry stream
   */
  private async processCategoryImageStream(
    entry: unzipper.Entry,
    categorySku: string,
    position: number,
    ext: string,
    categoryMap: Map<string, string>,
    categorySlugMap: Map<string, string>,
    strategy: ImageUploadStrategy,
    skipped: Array<{ sku: string; reason: string }>
  ): Promise<ProcessedImage | null> {
    try {
      let categoryId = categoryMap.get(categorySku);
      if (!categoryId) {
        categoryId = categorySlugMap.get(categorySku);
      }

      if (!categoryId) {
        entry.autodrain();
        this.logger.warn(`[ImageImport] Category SKU/slug not found: ${categorySku}`);
        skipped.push({ sku: categorySku, reason: 'SKU not found in database' });
        return null;
      }

      if (strategy === ImageUploadStrategy.SKIP) {
        const existing = await this.categoryImageRepository.findByCategoryId(categoryId);
        const existingAtPosition = existing.find(img => img.position === position);
        if (existingAtPosition) {
          entry.autodrain();
          this.logger.log(`[ImageImport] Skipping existing category image: categoryId=${categoryId}, position=${position}`);
          skipped.push({ sku: categorySku, reason: 'Existing image at same position' });
          return null;
        }
      }

      const storagePath = this.generateStoragePath(`category-${categorySku}`, position, ext);
      await this.storageService.uploadStream(storagePath, entry, this.getContentType(ext));

      const created = await this.categoryImageRepository.upsert(
        categoryId,
        position,
        storagePath,
        categorySku
      );

      if (position === 1) {
        await this.categoryRepository.updateImage(categoryId, storagePath);
        this.logger.log(`[ImageImport] Updated Category.imageUrl for categoryId=${categoryId}`);
      }

      this.logger.log(`[ImageImport] Created/updated category image: id=${created.id}, categoryId=${categoryId}, sku=${categorySku}`);

      return {
        sku: categorySku,
        position,
        ext,
        categoryId,
        imageUrl: storagePath,
        mappingType: 'category',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImport] Failed to process category image for SKU ${categorySku}: ${errorMessage}`);
      entry.autodrain();
      return null;
    }
  }

  /**
   * Process cell image from ZIP entry stream
   */
  private async processCellImageStream(
    entry: unzipper.Entry,
    cellSku: string,
    position: number,
    ext: string,
    cellSkuMap: Map<string, string>,
    strategy: ImageUploadStrategy,
    skipped: Array<{ sku: string; reason: string }>
  ): Promise<ProcessedImage | null> {
    try {
      const cellId = cellSkuMap.get(cellSku);

      if (!cellId) {
        entry.autodrain();
        this.logger.warn(`[ImageImport] Cell SKU not found: ${cellSku}`);
        skipped.push({ sku: cellSku, reason: 'SKU not found in database' });
        return null;
      }

      if (strategy === ImageUploadStrategy.SKIP) {
        const existing = await this.cellImageRepository.findBySkuAndPosition(cellSku, position);
        if (existing) {
          entry.autodrain();
          this.logger.log(`[ImageImport] Skipping existing cell image: SKU=${cellSku}, position=${position}`);
          skipped.push({ sku: cellSku, reason: 'Existing image at same position' });
          return null;
        }
      }

      const storagePath = this.generateStoragePath(`cell-${cellSku}`, position, ext);
      await this.storageService.uploadStream(storagePath, entry, this.getContentType(ext));

      const created = await this.cellImageRepository.upsert(
        cellId,
        position,
        storagePath,
        cellSku,
      );

      this.logger.log(`[ImageImport] Created/updated cell image: id=${created.id}, cellId=${cellId}, SKU=${cellSku}`);

      return {
        position,
        ext,
        cellId,
        imageUrl: storagePath,
        mappingType: 'cell_sku',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImport] Failed to process cell image for SKU ${cellSku}: ${errorMessage}`);
      entry.autodrain();
      return null;
    }
  }

  /**
   * Process product image from ZIP entry stream
   */
  private async processProductImageStream(
    entry: unzipper.Entry,
    productIdentifier: string,
    position: number,
    ext: string,
    productMap: Map<string, string>,
    productSkuMap: Map<string, string>,
    strategy: ImageUploadStrategy,
    skipped: Array<{ sku: string; reason: string }>
  ): Promise<ProcessedImage | null> {
    try {
      let productId = productSkuMap.get(productIdentifier);
      if (!productId) {
        productId = productMap.get(productIdentifier);
      }

      if (!productId) {
        entry.autodrain();
        this.logger.warn(`[ImageImport] Product SKU/slug not found: ${productIdentifier}`);
        skipped.push({ sku: productIdentifier, reason: 'SKU not found in database' });
        return null;
      }

      if (strategy === ImageUploadStrategy.SKIP) {
        const existing = await this.productImageRepository.findByProductId(productId);
        const existingAtPosition = existing.find(img => img.sortOrder === position);
        if (existingAtPosition) {
          entry.autodrain();
          this.logger.log(`[ImageImport] Skipping existing product image: productId=${productId}, position=${position}`);
          skipped.push({ sku: productIdentifier, reason: 'Existing image at same position' });
          return null;
        }
      }

      const storagePath = this.generateStoragePath(`product-${productIdentifier}`, position, ext);
      await this.storageService.uploadStream(storagePath, entry, this.getContentType(ext));

      const isPrimary = position === 1;
      const created = await this.productImageRepository.upsert(
        productId,
        position,
        storagePath,
        isPrimary
      );

      this.logger.log(`[ImageImport] Created/updated product image: id=${created.id}, productId=${productId}, identifier=${productIdentifier}`);

      return {
        position,
        ext,
        productId,
        imageUrl: storagePath,
        mappingType: 'product',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImport] Failed to process product image for identifier ${productIdentifier}: ${errorMessage}`);
      entry.autodrain();
      return null;
    }
  }
}

