import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { ExtractedFiles, ZipValidationResult, CATALOG_REQUIRED_CSV_FILES, ATTRIBUTE_REQUIRED_CSV_FILES, OPTIONAL_CSV_FILES } from '../dto';
import { ImportType } from '../entities';
import { StorageService } from '@modules/storage/storage.service';

@Injectable()
export class ZipExtractorService {
  private readonly logger = new Logger(ZipExtractorService.name);
  private readonly allowedFiles = [...CATALOG_REQUIRED_CSV_FILES, ...ATTRIBUTE_REQUIRED_CSV_FILES, ...OPTIONAL_CSV_FILES, 'simple-products.csv'];

  constructor(private readonly storageService: StorageService) {}

  /**
   * Extract ZIP file and upload to SeaweedFS
   */
  async extract(
    zipBuffer: Buffer,
    importType: ImportType = ImportType.CATALOG,
  ): Promise<ExtractedFiles> {
    this.logger.log(`Extracting ZIP and uploading to SeaweedFS (importType: ${importType})`);

    try {
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      const extractedFiles: ExtractedFiles = {};

      for (const entry of zipEntries) {
        if (entry.isDirectory) {
          continue;
        }

        const baseName = this.sanitizeFileName(entry.entryName);
        // Normalize: strip _template suffix (e.g. variants_template.csv -> variants.csv)
        const normalizedName = baseName.replace(/_template\.csv$/i, '.csv');

        if (!this.allowedFiles.includes(normalizedName)) {
          this.logger.debug(`Skipping disallowed file: ${normalizedName}`);
          continue;
        }

        const data = entry.getData();
        
        // Upload to SeaweedFS
        const timestamp = Date.now();
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const storageKey = `/imports/${year}/${month}/extracted/${timestamp}-${normalizedName}`;
        const fileUrl = await this.storageService.uploadFile(
          storageKey,
          data,
          'text/csv',
        );

        this.logger.debug(`Extracted and uploaded: ${entry.entryName} -> ${fileUrl}`);

        if (normalizedName === 'products.csv' || normalizedName === 'simple-products.csv') {
          extractedFiles.products = fileUrl;
        } else if (normalizedName === 'variants.csv') {
          extractedFiles.variants = fileUrl;
        } else if (normalizedName === 'images.csv') {
          extractedFiles.images = fileUrl;
        } else if (normalizedName === 'attributes.csv') {
          extractedFiles.attributes = fileUrl;
        } else if (normalizedName === 'attribute-options.csv') {
          extractedFiles.attributeOptions = fileUrl;
        }
      }

      // Validate based on import type
      if (importType === 'CATALOG' && !extractedFiles.variants) {
        throw new BadRequestException(
          'variants.csv is required but not found in ZIP archive. ' +
          'Accepted names: variants.csv or variants_template.csv (at root or inside a folder).',
        );
      }

      if (importType === 'ATTRIBUTES' && !extractedFiles.attributes) {
        throw new BadRequestException(
          'attributes.csv is required but not found in ZIP archive. ' +
          'Accepted names: attributes.csv or attributes_template.csv (at root or inside a folder).',
        );
      }

      if (importType === 'SIMPLE_PRODUCTS' && !extractedFiles.products) {
        throw new BadRequestException(
          'A product CSV is required but not found in ZIP archive. ' +
          'Accepted names: simple-products.csv, products.csv, or *_products.csv (at root or inside a folder).',
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
   * Sanitize filename from ZIP entry (remove path prefixes)
   */
  private sanitizeFileName(entryName: string): string {
    const parts = entryName.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Validate that required files are present in extracted files
   */
  validateRequiredFiles(files: ExtractedFiles, importType: ImportType = ImportType.CATALOG): ZipValidationResult {
    const errors: string[] = [];

    // Check required files based on import type
    if (importType === 'CATALOG') {
      if (!files.variants) {
        errors.push('variants.csv is required but not found in archive');
      }
    } else if (importType === 'ATTRIBUTES') {
      if (!files.attributes) {
        errors.push('attributes.csv is required but not found in archive');
      }
    } else if (importType === 'SIMPLE_PRODUCTS') {
      if (!files.products) {
        errors.push('A product CSV (simple-products.csv or products.csv) is required but not found in archive');
      }
    }

    const presentFiles: string[] = [];
    const missingOptionalFiles: string[] = [];

    for (const optional of OPTIONAL_CSV_FILES) {
      const key = this.mapFileNameToKey(optional);
      const filePath = files[key as keyof ExtractedFiles];

      if (filePath) {
        presentFiles.push(optional);
      } else {
        missingOptionalFiles.push(optional);
      }
    }

    const requiredFiles = importType === 'CATALOG' ? CATALOG_REQUIRED_CSV_FILES
      : importType === 'ATTRIBUTES' ? ATTRIBUTE_REQUIRED_CSV_FILES
      : ['simple-products.csv'];

    return {
      isValid: errors.length === 0,
      errors,
      requiredFiles,
      optionalFiles: presentFiles,
    };
  }

  /**
   * Clean up extracted files from SeaweedFS after processing
   */
  async cleanup(files: ExtractedFiles): Promise<void> {
    for (const [_key, fileUrl] of Object.entries(files)) {
      if (!fileUrl) continue;

      try {
        // Extract storage key from SeaweedFS URL
        const urlParts = new URL(fileUrl);
        const storageKey = urlParts.pathname;

        await this.storageService.deleteFile(storageKey);
        this.logger.debug(`Cleaned up extracted file from SeaweedFS: ${storageKey}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to cleanup extracted file ${fileUrl}: ${errorMessage}`);
      }
    }
  }

  /**
   * Map CSV filename to ExtractedFiles key
   */
  private mapFileNameToKey(fileName: string): string {
    const mapping: Record<string, string> = {
      'products.csv': 'products',
      'simple-products.csv': 'products',
      'variants.csv': 'variants',
      'images.csv': 'images',
      'attributes.csv': 'attributes',
      'attribute-options.csv': 'attributeOptions',
    };
    return mapping[fileName] || fileName;
  }
}
