import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { ExtractedFiles, ZipValidationResult, REQUIRED_CSV_FILES, OPTIONAL_CSV_FILES } from '../dto';

@Injectable()
export class ZipExtractorService {
  private readonly logger = new Logger(ZipExtractorService.name);
  private readonly allowedFiles = [...REQUIRED_CSV_FILES, ...OPTIONAL_CSV_FILES];

  /**
   * Extract ZIP file to target directory
   */
  async extract(zipBuffer: Buffer, targetDir: string): Promise<ExtractedFiles> {
    this.logger.log(`Extracting ZIP to: ${targetDir}`);

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    try {
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      const extractedFiles: ExtractedFiles = {
        variants: '',
      };

      for (const entry of zipEntries) {
        if (entry.isDirectory) {
          continue;
        }

        const baseName = path.basename(entry.entryName);
        // Normalize: strip _template suffix (e.g. variants_template.csv -> variants.csv)
        const normalizedName = baseName.replace(/_template\.csv$/i, '.csv');

        if (!this.allowedFiles.includes(normalizedName)) {
          continue;
        }

        const filePath = path.join(targetDir, normalizedName);
        const data = entry.getData();
        fs.writeFileSync(filePath, data);

        this.logger.debug(`Extracted: ${entry.entryName} -> ${filePath}`);

        if (normalizedName === 'products.csv') {
          extractedFiles.products = filePath;
        } else if (normalizedName === 'variants.csv') {
          extractedFiles.variants = filePath;
        } else if (normalizedName === 'images.csv') {
          extractedFiles.images = filePath;
        } else if (normalizedName === 'attributes.csv') {
          extractedFiles.attributes = filePath;
        } else if (normalizedName === 'attribute-options.csv') {
          extractedFiles.attributeOptions = filePath;
        }
      }

      if (!extractedFiles.variants) {
        throw new BadRequestException(
          'variants.csv is required but not found in the ZIP archive. ' +
          'Accepted names: variants.csv or variants_template.csv (at root or inside a folder).',
        );
      }

      return extractedFiles;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to extract ZIP: ${errorMessage}`);
      throw new BadRequestException(`Failed to extract ZIP file: ${errorMessage}`);
    }
  }

  /**
   * Validate that required files are present in extracted files
   */
  validateRequiredFiles(files: ExtractedFiles): ZipValidationResult {
    const errors: string[] = [];

    // Check required files
    if (!files.variants || !fs.existsSync(files.variants)) {
      errors.push('variants.csv is required but not found in the archive');
    }

    const presentFiles: string[] = [];
    const missingOptionalFiles: string[] = [];

    for (const optional of OPTIONAL_CSV_FILES) {
      const key = this.mapFileNameToKey(optional);
      const filePath = files[key as keyof ExtractedFiles];

      if (filePath && fs.existsSync(filePath)) {
        presentFiles.push(optional);
      } else {
        missingOptionalFiles.push(optional);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      requiredFiles: REQUIRED_CSV_FILES,
      optionalFiles: presentFiles,
    };
  }

  /**
   * Clean up extracted files after processing
   */
  async cleanup(targetDir: string): Promise<void> {
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        this.logger.debug(`Cleaned up extraction directory: ${targetDir}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cleanup extraction directory ${targetDir}: ${errorMessage}`);
    }
  }

  /**
   * Map CSV filename to ExtractedFiles key
   */
  private mapFileNameToKey(fileName: string): string {
    const mapping: Record<string, string> = {
      'products.csv': 'products',
      'variants.csv': 'variants',
      'images.csv': 'images',
      'attributes.csv': 'attributes',
      'attribute-options.csv': 'attributeOptions',
    };
    return mapping[fileName] || fileName;
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      this.logger.warn(`Failed to get file size for ${filePath}`);
      return 0;
    }
  }

  /**
   * Count lines in CSV file (for progress tracking)
   */
  async countCsvLines(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 0;
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });

      stream.on('data', (chunk: string | Buffer) => {
        const lines = (typeof chunk === 'string' ? chunk : chunk.toString()).split('\n');
        count += lines.length - 1; // -1 because last line might not have newline
      });

      stream.on('end', () => {
        // Subtract header row
        resolve(Math.max(0, count - 1));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }
}
