import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import unzipper from 'unzipper';
import pLimit from 'p-limit';
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

export interface ImageFile {
  sku: string;
  position: number;
  ext: string;
  fileName: string;
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
   * Validate URL is accessible
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const contentType = response.headers['content-type'] || '';
      return contentType.startsWith('image/');
    } catch (error) {
      this.logger.debug(`URL validation failed for ${url}`);
      return false;
    }
  }

  /**
   * Get image info (size, dimensions)
   */
  async getImageInfo(filePath: string): Promise<{ size: number; width?: number; height?: number }> {
    const stats = fs.statSync(filePath);
    
    // In production, use sharp or jimp to get dimensions
    // For now, just return size
    return {
      size: stats.size,
    };
  }

  /**
   * Clean up old images
   */
  async cleanupOldImages(olderThanDays = 7): Promise<void> {
    try {
      const now = Date.now();
      const maxAge = olderThanDays * 24 * 60 * 60 * 1000;
      let cleanedCount = 0;

      const files = fs.readdirSync(this.uploadDir);
      
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old images`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cleanup old images: ${errorMessage}`);
    }
  }

  /**
   * Process image ZIP file using streaming
   */
  async processImageZip(zipPath: string): Promise<ProcessedImage[]> {
    this.logger.log(`[ImageImport] Starting ZIP processing: ${zipPath}`);
    const results: ProcessedImage[] = [];

    // Preload all maps ONCE at the start for O(1) lookups
    this.logger.log(`[ImageImport] Preloading SKU, category, cell SKU, and product maps from database...`);
    const [skuMap, categoryMap, categorySlugMap, cellSkuMap, productMap] = await Promise.all([
      this.productVariantRepository.getSkuMap(),
      this.categoryRepository.getSkuMap(),
      this.categoryRepository.getSlugMap(),
      this.cellRepository.getSkuMap(),
      this.productRepository.getSlugMap(),
    ]);
    this.logger.log(`[ImageImport] Loaded ${skuMap.size} variant SKUs, ${categoryMap.size} category SKUs, ${categorySlugMap.size} category slugs, ${cellSkuMap.size} cell SKUs, ${productMap.size} products for image processing`);

    // Use unzipper.Open.file() for controlled async iteration
    const directory = await unzipper.Open.file(zipPath);
    this.logger.log(`[ImageImport] ZIP contains ${directory.files.length} total files`);
    const limit = pLimit(this.concurrencyLimit);

    const filePromises: Promise<void>[] = [];
    let processedCount = 0;
    const processedVariants = new Set<string>();
    const processedProducts = new Set<string>();

    for (const file of directory.files) {
      if (!this.isValidImageFile(file.path)) {
        this.logger.debug(`[ImageImport] Skipping invalid image file: ${file.path}`);
        continue;
      }

      this.logger.log(`[ImageImport] Processing file: ${file.path}`);

      const promise = limit(async () => {
        try {
          // Extract just the filename (without directory path)
          const filename = path.basename(file.path);
          this.logger.debug(`[ImageImport] Processing file: ${filename} (from path: ${file.path})`);

          // Parse filename to extract SKU and position
          const { sku, position, ext } = this.parseImageFilename(filename);

          // Detect mapping type from SKU prefix (instead of folder path)
          const mappingType = this.detectMappingType(sku);

          // Route to appropriate processor based on mapping type
          if (mappingType === 'sku') {
            const variantId = skuMap.get(sku);
            if (!variantId) {
              this.logger.warn(`[ImageImport] SKU not found: ${sku} (filename: ${filename})`);
              return;
            }

            this.logger.log(`[ImageImport] Found variantId ${variantId} for SKU ${sku} (position: ${position})`);

            // Get stream for each file
            const stream = file.stream();
            const buffer = await this.streamToBuffer(stream);

            // Generate storage path
            const storagePath = this.generateStoragePath(sku, position, ext);

            // Upload to SeaweedFS
            await this.uploadToSeaweedFS(storagePath, buffer, this.getContentType(ext));

            // Create variant image record
            const created = await this.variantImageRepository.upsert(
              variantId,
              position,
              storagePath,
              sku
            );

            this.logger.log(`[ImageImport] Created/updated variant image: id=${created.id}, variantId=${variantId}, sku=${sku}, position=${position}`);

            results.push({
              sku,
              position,
              ext,
              variantId,
              storagePath,
              mappingType: 'sku',
            });

            processedVariants.add(variantId);
          } else if (mappingType === 'category') {
            // Process category image
            const result = await this.processCategoryImage(
              file,
              sku,
              position,
              ext,
              categoryMap,
              categorySlugMap
            );

            if (result) {
              results.push(result);
            }
          } else if (mappingType === 'cell_sku') {
            // Process cell image by SKU (C- prefix)
            const result = await this.processCellImage(
              file,
              sku,
              position,
              ext,
              cellSkuMap
            );

            if (result) {
              results.push(result);
            }
          } else if (mappingType === 'product') {
            // Process product image
            const result = await this.processProductImage(
              file,
              sku,
              position,
              ext,
              productMap
            );

            if (result) {
              results.push(result);
              if (result.productId) {
                processedProducts.add(result.productId);
              }
            }
          }

          this.logger.debug(`[ImageImport] Processed: ${filename} -> ${mappingType} ${sku}, position ${position}`);
          processedCount++;

          // Log progress every 10 images
          if (processedCount % 10 === 0) {
            this.logger.log(`[ImageImport] Progress: ${processedCount} images processed`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`[ImageImport] Failed to process ${file.path}: ${errorMessage}`);
          if (error instanceof Error && error.stack) {
            this.logger.debug(`[ImageImport] Stack trace: ${error.stack}`);
          }
        }
      });

      filePromises.push(promise);
    }

    await Promise.all(filePromises);

    // Ensure each variant has a primary image
    this.logger.log(`[ImageImport] Ensuring primary image for ${processedVariants.size} variants`);

    for (const variantId of processedVariants) {
      await this.ensurePrimaryImage(variantId);
    }

    this.logger.log(`[ImageImport] ZIP processing complete: ${results.length} images processed from ${directory.files.length} total files`);
    return results;
  }

  /**
   * Parse image filename to extract SKU and position
   * Supports formats:
   * - SKU.ext (no position, defaults to 1)
   * - SKU-POSITION.ext
   * - SKU(POSITION).ext
   * - SKU (POSITION).ext (with space)
   */
  parseImageFilename(filename: string): { sku: string; position: number; ext: string } {
    // Normalize (remove spaces)
    filename = filename.replace(/\s+/g, "");

    // First try: SKU with position (e.g., SKU-1.ext or SKU(1).ext)
    const match = filename.match(
      /^(.+?)(?:-(\d+)|\((\d+)\))\.(jpg|jpeg|png|webp|gif)$/i
    );

    if (match) {
      const sku = match[1];
      const position = parseInt(match[2] || match[3], 10);
      const ext = match[4].toLowerCase();
      return { sku, position, ext };
    }

    // Second try: SKU without position (e.g., SKU.jpg)
    const matchNoPosition = filename.match(/^(.+?)\.(jpg|jpeg|png|webp|gif)$/i);

    if (matchNoPosition) {
      const sku = matchNoPosition[1];
      const position = 1; // Default to position 1 for images without position
      const ext = matchNoPosition[2].toLowerCase();
      return { sku, position, ext };
    }

    throw new Error(`Invalid filename format: ${filename}`);
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
   * Upload file to SeaweedFS
   */
  async uploadToSeaweedFS(key: string, buffer: Buffer, contentType: string): Promise<string> {
    return this.storageService.uploadFile(key, buffer, contentType);
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
   * Detect image mapping type from SKU prefix
   * - CG-* → Category
   * - C-* → Cell
   * - Others → ProductVariant (existing behavior)
   */
  detectMappingType(sku: string): ImageMappingType {
    if (sku.startsWith('CG-')) return 'category';
    if (sku.startsWith('C-')) return 'cell_sku';
    return 'sku'; // Variant (default)
  }

  /**
   * Process cell image from ZIP file
   */
  async processCellImage(
    file: unzipper.File,
    cellSku: string,
    position: number,
    ext: string,
    cellMap: Map<string, string>
  ): Promise<ProcessedImage | null> {
    try {
      this.logger.log(`[ImageImport] Starting cell image processing: SKU=${cellSku}, position=${position}, ext=${ext}`);

      const cellId = cellMap.get(cellSku);

      if (!cellId) {
        this.logger.warn(`[ImageImport] Cell SKU not found in map: ${cellSku}. Map contains ${cellMap.size} entries`);
        return null;
      }

      this.logger.log(`[ImageImport] Found cellId ${cellId} for SKU ${cellSku}`);

      // Get stream for file
      this.logger.debug(`[ImageImport] Converting cell file to buffer: ${file.path}`);
      const stream = file.stream();
      const buffer = await this.streamToBuffer(stream);

      this.logger.debug(`[ImageImport] Cell buffer size: ${buffer.length} bytes`);

      // Generate storage path for cell image
      const storagePath = this.generateStoragePath(`cell-${cellSku}`, position, ext);
      this.logger.log(`[ImageImport] Generated storage path: ${storagePath}`);

      // Upload to SeaweedFS
      this.logger.log(`[ImageImport] Uploading cell image to SeaweedFS...`);
      const imageUrl = await this.uploadToSeaweedFS(storagePath, buffer, this.getContentType(ext));
      this.logger.log(`[ImageImport] Cell image uploaded to SeaweedFS: ${imageUrl}`);

      // Create or update cell image record
      const isPrimary = position === 1;
      this.logger.log(`[ImageImport] Creating/updating cell image record: cellId=${cellId}, position=${position}, isPrimary=${isPrimary}`);
      const created = await this.cellImageRepository.upsert(
        cellId,
        position,
        imageUrl,
        cellSku,
      );

      this.logger.log(`[ImageImport] Successfully created/updated cell image: id=${created.id}, cellId=${cellId}, SKU=${cellSku}, position=${position}, isPrimary=${isPrimary}`);

      return {
        position,
        ext,
        cellId,
        imageUrl,
        mappingType: 'cell_sku',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImport] Failed to process cell image for SKU ${cellSku}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Process product image from ZIP file
   */
  async processProductImage(
    file: unzipper.File,
    productSlug: string,
    position: number,
    ext: string,
    productMap: Map<string, string>
  ): Promise<ProcessedImage | null> {
    try {
      this.logger.log(`[ImageImport] Starting product image processing: slug=${productSlug}, position=${position}, ext=${ext}`);

      const productId = productMap.get(productSlug);

      if (!productId) {
        this.logger.warn(`[ImageImport] Product slug not found in map: ${productSlug}. Map contains ${productMap.size} entries`);
        return null;
      }

      this.logger.log(`[ImageImport] Found productId ${productId} for slug ${productSlug} (position: ${position})`);

      // Get stream for file
      this.logger.debug(`[ImageImport] Converting product file to buffer: ${file.path}`);
      const stream = file.stream();
      const buffer = await this.streamToBuffer(stream);

      this.logger.debug(`[ImageImport] Product buffer size: ${buffer.length} bytes`);

      // Generate storage path for product image
      const storagePath = this.generateStoragePath(`product-${productSlug}`, position, ext);
      this.logger.log(`[ImageImport] Generated storage path: ${storagePath}`);

      // Upload to SeaweedFS
      this.logger.log(`[ImageImport] Uploading product image to SeaweedFS...`);
      const imageUrl = await this.uploadToSeaweedFS(storagePath, buffer, this.getContentType(ext));
      this.logger.log(`[ImageImport] Product image uploaded to SeaweedFS: ${imageUrl}`);

      // Create or update product image record
      const isPrimary = position === 1;
      this.logger.log(`[ImageImport] Creating/updating product image record: productId=${productId}, position=${position}, isPrimary=${isPrimary}`);
      const created = await this.productImageRepository.upsert(
        productId,
        position,
        imageUrl,
        isPrimary
      );

      this.logger.log(`[ImageImport] Successfully created/updated product image: id=${created.id}, productId=${productId}, slug=${productSlug}, position=${position}, isPrimary=${isPrimary}`);

      return {
        position,
        ext,
        productId,
        imageUrl,
        mappingType: 'product',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImport] Failed to process product image for slug ${productSlug}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Process category image from ZIP file
   */
  async processCategoryImage(
    file: unzipper.File,
    categorySku: string,
    position: number,
    ext: string,
    categoryMap: Map<string, string>,
    categorySlugMap: Map<string, string>
  ): Promise<ProcessedImage | null> {
    try {
      this.logger.log(`[ImageImport] Starting category image processing: sku=${categorySku}, position=${position}, ext=${ext}`);

      // Try to find by SKU first (CG- prefix), then by slug
      let categoryId = categoryMap.get(categorySku);

      if (!categoryId) {
        // Try to find by slug (in case the filename uses slug instead of SKU)
        categoryId = categorySlugMap.get(categorySku);
      }

      if (!categoryId) {
        this.logger.warn(`[ImageImport] Category SKU/slug not found in map: ${categorySku}. SKU map contains ${categoryMap.size} entries, slug map contains ${categorySlugMap.size} entries`);
        return null;
      }

      this.logger.log(`[ImageImport] Found categoryId ${categoryId} for SKU ${categorySku} (position: ${position})`);

      // Get stream for file
      this.logger.debug(`[ImageImport] Converting category file to buffer: ${file.path}`);
      const stream = file.stream();
      const buffer = await this.streamToBuffer(stream);

      this.logger.debug(`[ImageImport] Category buffer size: ${buffer.length} bytes`);

      // Generate storage path for category image
      const storagePath = this.generateStoragePath(`category-${categorySku}`, position, ext);
      this.logger.log(`[ImageImport] Generated storage path: ${storagePath}`);

      // Upload to SeaweedFS
      this.logger.log(`[ImageImport] Uploading category image to SeaweedFS...`);
      const imageUrl = await this.uploadToSeaweedFS(storagePath, buffer, this.getContentType(ext));
      this.logger.log(`[ImageImport] Category image uploaded to SeaweedFS: ${imageUrl}`);

      // Create or update category image record
      const isPrimary = position === 1;
      this.logger.log(`[ImageImport] Creating/updating category image record: categoryId=${categoryId}, position=${position}, isPrimary=${isPrimary}`);
      const created = await this.categoryImageRepository.upsert(
        categoryId,
        position,
        imageUrl,
        categorySku
      );

      this.logger.log(`[ImageImport] Successfully created/updated category image: id=${created.id}, categoryId=${categoryId}, sku=${categorySku}, position=${position}, isPrimary=${isPrimary}`);

      return {
        sku: categorySku,
        position,
        ext,
        imageUrl,
        mappingType: 'category',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[ImageImport] Failed to process category image for SKU ${categorySku}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Check if file is a valid image
   */
  private isValidImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
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
}

