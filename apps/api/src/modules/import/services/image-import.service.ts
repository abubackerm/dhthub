import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ImportedImage {
  sku: string;
  originalUrl: string;
  storedUrl: string;
  fileName: string;
}

@Injectable()
export class ImageImportService {
  private readonly logger = new Logger(ImageImportService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'import', 'images');
  private readonly maxRetries = 3;
  private readonly timeout = 30000; // 30 seconds

  constructor() {
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
}
