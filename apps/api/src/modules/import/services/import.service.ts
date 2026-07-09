import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ImportJobService } from './import-job.service';
import { CsvParserService } from './csv-parser.service';
import { ImportValidationService, ValidationResult } from './import-validation.service';
import { ImportFileType, ImportMode, ImportType } from '../entities';
import { TemplatePackService } from './template-pack.service';
import { InvalidFileFormatError, InvalidImportDataError } from '../domain/errors/import.errors';
import { Readable } from 'stream';
import { StorageService } from '@modules/storage/storage.service';
import { ProductRepository } from '@modules/catalog/repositories/product.repository';
import { ProductVariantRepository } from '@modules/catalog/repositories/product-variant.repository';
import { ProductTableColumnRepository } from '@modules/catalog/repositories/product-table-column.repository';
import { CellRepository } from '@modules/cell';

export interface UploadResult {
  jobId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
}

export interface UploadedFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  originalname?: string;
}

export interface ValidationResultWithCount extends ValidationResult {
  rowNumber: number;
}

export interface ValidateOnlyResult {
  isValid: boolean;
  totalRows: number;
  totalErrors: number;
  totalWarnings: number;
  errors: ValidationResultWithCount[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly maxFileSizeBytes = 200 * 1024 * 1024; // 200MB
  private readonly maxRows = 500_000;

  constructor(
    private readonly importJobService: ImportJobService,
    private readonly csvParserService: CsvParserService,
    private readonly importValidationService: ImportValidationService,
    private readonly storageService: StorageService,
    private readonly productRepo: ProductRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly productTableColumnRepo: ProductTableColumnRepository,
    private readonly cellRepo: CellRepository,
    private readonly templatePackService: TemplatePackService,
  ) {}

  /**
   * Upload CSV file and create import job
   */
  async uploadCsv(
    file: UploadedFile,
    options?: {
      createdBy?: string;
      enqueueJob?: boolean;
      mode?: ImportMode;
      warehouseId?: string;
      importType?: ImportType;
    },
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const originalname = file.originalname ?? file.filename;
    if (file.mimetype !== 'text/csv' && !originalname.endsWith('.csv')) {
      throw new InvalidFileFormatError(originalname, 'CSV');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('CSV file too large');
    }

    this.logger.log(`Uploading CSV file: ${originalname} (${file.size} bytes)`);

    // Save file to SeaweedFS
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const storageKey = `imports/${year}/${month}/${timestamp}-${originalname}`;
    const fileUrl = await this.storageService.uploadFile(
      storageKey,
      file.buffer,
      'text/csv',
    );

    this.logger.debug(`File uploaded to SeaweedFS: ${fileUrl}`);

    // Count rows in CSV
    const fileStream = Readable.from(file.buffer);
    const totalRows = await this.csvParserService.countRows(fileStream);

    if (totalRows > this.maxRows) {
      this.logger.warn(
        `CSV row limit exceeded: ${totalRows} rows (max ${this.maxRows}) for file ${originalname}`,
      );
      throw new BadRequestException('CSV file too large');
    }

    // Create import job
    const job = await this.importJobService.create({
      fileUrl,
      fileName: originalname,
      fileSize: file.size,
      type: ImportFileType.CSV,
      totalRows,
      createdBy: options?.createdBy,
      mode: options?.mode ?? undefined,
      warehouseId: options?.warehouseId ?? undefined,
      originalFilePath: storageKey,
      importType: options?.importType,
    });

    this.logger.log(`CSV upload complete: job ${job.id}, ${totalRows} rows`);

    return {
      jobId: job.id,
      fileUrl: job.fileUrl,
      fileName: job.fileName ?? '',
      fileSize: job.fileSize ?? 0,
      totalRows,
    };
  }

  /**
   * Upload ZIP file and create import job
   */
  async uploadZip(
    file: UploadedFile,
    options?: {
      createdBy?: string;
      mode?: ImportMode;
      warehouseId?: string;
      importType?: ImportType;
      strategy?: 'skip' | 'replace';
    },
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const originalname = file.originalname ?? file.filename;
    if (file.mimetype !== 'application/zip' && !originalname.endsWith('.zip')) {
      throw new InvalidFileFormatError(originalname, 'ZIP');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('ZIP file too large');
    }

    const fileSizeKB = (file.size / 1024).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    this.logger.log(`[uploadZip] Starting ZIP file upload`);
    this.logger.log(`[uploadZip]   - Filename: ${originalname}`);
    this.logger.log(`[uploadZip]   - Size: ${file.size} bytes (${fileSizeKB} KB, ${fileSizeMB} MB)`);
    this.logger.log(`[uploadZip]   - MIME type: ${file.mimetype}`);
    this.logger.log(`[uploadZip]   - Import type: ${options?.importType || 'CATALOG'}`);
    this.logger.log(`[uploadZip]   - Mode: ${options?.mode || 'UPSERT'}`);
    this.logger.log(`[uploadZip]   - Strategy: ${options?.strategy || 'replace'}`);
    this.logger.log(`[uploadZip]   - Created by: ${options?.createdBy || 'unknown'}`);

    // Save file to SeaweedFS
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const storageKey = `imports/${year}/${month}/${timestamp}-${originalname}`;

    this.logger.log(`[uploadZip] Uploading to SeaweedFS...`);
    this.logger.log(`[uploadZip]   - Storage key: ${storageKey}`);
    this.logger.log(`[uploadZip]   - Timestamp: ${timestamp}`);

    const uploadStartTime = Date.now();
    const fileUrl = await this.storageService.uploadFile(
      storageKey,
      file.buffer,
      'application/zip',
    );
    const uploadDuration = Date.now() - uploadStartTime;

    this.logger.log(`[uploadZip] SeaweedFS upload complete`);
    this.logger.log(`[uploadZip]   - File URL: ${fileUrl}`);
    this.logger.log(`[uploadZip]   - Upload duration: ${uploadDuration}ms`);

    // Wait 3 seconds to allow SeaweedFS to fully process the file
    this.logger.log(`[uploadZip] Waiting 3 seconds for SeaweedFS to fully process uploaded file...`);
    const waitStartTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.logger.log(`[uploadZip] Wait complete (${Date.now() - waitStartTime}ms elapsed)`);

    // Create import job (will process ZIP later in worker)
    this.logger.log(`[uploadZip] Creating import job...`);

    const job = await this.importJobService.create({
      fileUrl,
      fileName: originalname,
      fileSize: file.size,
      type: ImportFileType.ZIP,
      totalRows: 0, // Will be calculated after extraction
      createdBy: options?.createdBy,
      mode: options?.mode ?? undefined,
      warehouseId: options?.warehouseId ?? undefined,
      originalFilePath: storageKey,
      importType: options?.importType,
    });

    this.logger.log(`[uploadZip] Import job created successfully`);
    this.logger.log(`[uploadZip]   - Job ID: ${job.id}`);
    this.logger.log(`[uploadZip]   - Job status: ${job.status}`);
    this.logger.log(`[uploadZip]   - Job type: ${job.type}`);
    this.logger.log(`[uploadZip]   - Import type: ${job.importType}`);
    this.logger.log(`[uploadZip] ZIP upload complete: job ${job.id}`);

    const totalDuration = Date.now() - timestamp;
    this.logger.log(`[uploadZip] Total operation duration: ${totalDuration}ms (upload: ${uploadDuration}ms + wait: 3000ms + job creation: ${totalDuration - uploadDuration - 3000}ms)`);

    return {
      jobId: job.id,
      fileUrl: job.fileUrl,
      fileName: job.fileName ?? '',
      fileSize: job.fileSize ?? 0,
      totalRows: 0,
    };
  }

  /**
   * Validate CSV file without importing (dry run)
   */
  async validateOnly(
    file: UploadedFile,
    _options?: {
      createdBy?: string;
    },
  ): Promise<ValidateOnlyResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const originalname = file.originalname ?? file.filename;
    if (file.mimetype !== 'text/csv' && !originalname.endsWith('.csv')) {
      throw new InvalidFileFormatError(originalname, 'CSV');
    }

    this.logger.log(`Validating CSV file: ${originalname}`);

    // Build validation context
    const context = await this.importValidationService.buildValidationContext();

    // Parse and validate all rows
    const fileStream = Readable.from(file.buffer);
    const results: ValidationResultWithCount[] = [];
    let totalRows = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    try {
      for await (const { rowNumber, data } of this.csvParserService.parseStream(fileStream)) {
        totalRows++;
        const result = await this.importValidationService.validateRow(
          rowNumber,
          data,
          context,
          true, // validateOnly mode
        );

        if (result.errors.length > 0) {
          results.push({
            ...result,
            rowNumber,
          });

          for (const error of result.errors) {
            if (error.severity === 'error') {
              totalErrors++;
            } else {
              totalWarnings++;
            }
          }
        }
      }

      this.logger.log(
        `Validation complete: ${totalRows} rows, ${totalErrors} errors, ${totalWarnings} warnings`,
      );

      return {
        isValid: totalErrors === 0,
        totalRows,
        totalErrors,
        totalWarnings,
        errors: results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Validation failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new InvalidImportDataError(`Validation error: ${errorMessage}`);
    }
  }

  /**
   * Get CSV template headers and description
   */
  async getTemplateInfo(_cellId?: string, mode?: 'create' | 'edit', importType?: string) {
    // Return simple products template info when importType is SIMPLE_PRODUCTS
    if (importType === 'SIMPLE_PRODUCTS') {
      return this.getSimpleProductsTemplateInfo();
    }

    // Build header list based on mode
    const headers = [];

    // Add product_sku only for edit mode
    if (mode === 'edit') {
      headers.push({ name: 'product_sku', required: true, description: 'User-provided product identifier (for edit mode matching)' });
    }

    headers.push(
      { name: 'product_name', required: true, description: 'Product name' },
      { name: 'cell_sku', required: false, description: 'Cell SKU (optional)' },
      { name: 'at_head1', required: false, description: 'Attribute header 1 - enter attribute slug' },
      { name: 'at_head2', required: false, description: 'Attribute header 2 - enter attribute slug' },
      { name: 'at_head3', required: false, description: 'Attribute header 3 - enter attribute slug' },
      { name: 'at_head4', required: false, description: 'Attribute header 4 - enter attribute slug' },
      { name: 'at_head5', required: false, description: 'Attribute header 5 - enter attribute slug' },
      { name: 'at_head6', required: false, description: 'Attribute header 6 - enter attribute slug' },
      { name: 'at_head7', required: false, description: 'Attribute header 7 - enter attribute slug' },
      { name: 'at_head8', required: false, description: 'Attribute header 8 - enter attribute slug' },
      { name: 'at_head9', required: false, description: 'Attribute header 9 - enter attribute slug' },
      { name: 'at_head10', required: false, description: 'Attribute header 10 - enter attribute slug' },
      { name: 'at_head11', required: false, description: 'Attribute header 11 - enter attribute slug' },
      { name: 'at_head12', required: false, description: 'Attribute header 12 - enter attribute slug' },
      { name: 'at_head13', required: false, description: 'Attribute header 13 - enter attribute slug' },
      { name: 'at_head14', required: false, description: 'Attribute header 14 - enter attribute slug' },
      { name: 'at_head15', required: false, description: 'Attribute header 15 - enter attribute slug' },
      { name: 'description', required: false, description: 'Product description' },
    );

    return {
      filename: mode === 'edit' ? 'products-edit-template.csv' : 'products-template.csv',
      headers,
      description: mode === 'edit'
        ? 'Template for editing existing products. Contains all current product data. Edit values and upload to update.'
        : 'Template for bulk product import. SKUs are auto-generated.',
    };
  }

  /**
   * Get simple products template info
   */
  private getSimpleProductsTemplateInfo() {
    const headers = [
      { name: 'category_sku', required: true, description: 'SKU of the leaf Category (e.g., CG-A1B2C3D4). Products go into this category.' },
      { name: 'name', required: true, description: 'Product name' },
      { name: 'description', required: false, description: 'Product description' },
      { name: 'price', required: false, description: 'Price in cents (integer)' },
      { name: 'quantity', required: false, description: 'Stock quantity' },
      { name: 'attr_slug_1', required: false, description: 'Attribute slug for pair 1' },
      { name: 'attr_value_1', required: false, description: 'Attribute value for pair 1' },
      { name: 'attr_slug_2', required: false, description: 'Attribute slug for pair 2' },
      { name: 'attr_value_2', required: false, description: 'Attribute value for pair 2' },
      { name: 'attr_slug_3', required: false, description: 'Attribute slug for pair 3' },
      { name: 'attr_value_3', required: false, description: 'Attribute value for pair 3' },
      { name: 'attr_slug_4', required: false, description: 'Attribute slug for pair 4' },
      { name: 'attr_value_4', required: false, description: 'Attribute value for pair 4' },
      { name: 'attr_slug_5', required: false, description: 'Attribute slug for pair 5' },
      { name: 'attr_value_5', required: false, description: 'Attribute value for pair 5' },
      { name: 'attr_slug_6', required: false, description: 'Attribute slug for pair 6' },
      { name: 'attr_value_6', required: false, description: 'Attribute value for pair 6' },
      { name: 'attr_slug_7', required: false, description: 'Attribute slug for pair 7' },
      { name: 'attr_value_7', required: false, description: 'Attribute value for pair 7' },
    ];

    return {
      filename: 'simple-products_template.csv',
      headers,
      description: 'Template for simple product bulk import. Each row is a single product with flat fields and optional attribute pairs. SKUs are auto-generated.',
    };
  }

  /**
   * Get CSV template content as string
   */
  async getTemplate(_cellId?: string, mode?: 'create' | 'edit', importType?: string): Promise<string> {
    // Return simple products template when importType is SIMPLE_PRODUCTS
    if (importType === 'SIMPLE_PRODUCTS') {
      return this.templatePackService.generateSimpleProductsTemplate();
    }

    // Build headers based on mode
    const headers = [];

    if (mode === 'edit') {
      headers.push('product_sku');
    }

    headers.push(
      'product_name',
      'cell_sku',
      'at_head1',
      'at_head2',
      'at_head3',
      'at_head4',
      'at_head5',
      'at_head6',
      'at_head7',
      'at_head8',
      'at_head9',
      'at_head10',
      'at_head11',
      'at_head12',
      'at_head13',
      'at_head14',
      'at_head15',
      'description',
    );

    if (mode === 'edit') {
      // Fetch all products with their variants
      const products = await this.productRepo.findMany();
      
      // Fetch cell data separately for all products that have cellId
      const cellIds = products
        .map(p => p.cellId)
        .filter((id): id is string => id !== null);
      
      const cellMap = new Map<string, { slug: string; sku: string | null }>();
      if (cellIds.length > 0) {
        const cells = await this.cellRepo.findByIds(cellIds);
        cells.forEach(cell => cellMap.set(cell.id, { slug: cell.slug, sku: cell.sku }));
      }

      const rows = [];
      for (const product of products) {
        // For each product, get its default variant or first variant
        const variants = await this.variantRepo.findByProductId(product.id);
        const defaultVariant = variants.find(v => v.isDefault) || variants[0];

        // Get table column definitions (at_head mappings) for this product
        const tableColumns = await this.productTableColumnRepo.findByProductIdWithDetails(product.id);

        // Map table column positions to attribute slugs
        const atHeads: string[] = Array(15).fill('');
        for (const tc of tableColumns) {
          if (tc.position >= 1 && tc.position <= 15 && tc.attribute?.slug) {
            atHeads[tc.position - 1] = tc.attribute.slug;
          }
        }

        // Get cell SKU from cellMap if product has a cellId
        const cellSku = product.cellId ? cellMap.get(product.cellId)?.sku || '' : '';

        const row = [
          defaultVariant?.sku || '',
          product.name,
          cellSku,
          ...atHeads,
          product.description || '',
        ];
        rows.push(row);
      }

      const csvRows = rows.map(row => 
        row.map(cell => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      );

      return [headers.join(','), ...csvRows].join('\n');
    }

    // Create mode: just return headers (no product_sku)
    const csvString = headers.join(',') + '\n';
    return csvString;
  }
}
