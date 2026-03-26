import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ImportJobService } from './import-job.service';
import { CsvParserService } from './csv-parser.service';
import { ImportValidationService, ValidationResult } from './import-validation.service';
import { ImportFileType, ImportMode, ImportType } from '../entities';
import { InvalidFileFormatError, InvalidImportDataError } from '../domain/errors/import.errors';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { CellRepository } from '@modules/cell/repositories/cell.repository';

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
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'import');

  private readonly maxFileSizeBytes = 200 * 1024 * 1024; // 200MB
  private readonly maxRows = 500_000;

  constructor(
    private readonly importJobService: ImportJobService,
    private readonly csvParserService: CsvParserService,
    private readonly importValidationService: ImportValidationService,
    private readonly cellRepository: CellRepository,
  ) {
    this.ensureUploadDirectory();
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

    // Save file to local filesystem
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const storageFileName = `${timestamp}-${originalname}`;
    const relativePath = path.join('imports', `${year}`, `${month}`, storageFileName);
    const filePath = path.join(this.uploadDir, relativePath);
    const fileUrl = `/uploads/import/${relativePath.replace(/\\/g, '/')}`;

    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, file.buffer);

    this.logger.debug(`File saved to: ${filePath}`);

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
      originalFilePath: relativePath.replace(/\\/g, '/'),
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

    this.logger.log(`Uploading ZIP file: ${originalname} (${file.size} bytes)`);

    // Save file to local filesystem
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const storageFileName = `${timestamp}-${originalname}`;
    const relativePath = path.join('imports', `${year}`, `${month}`, storageFileName);
    const filePath = path.join(this.uploadDir, relativePath);
    const fileUrl = `/uploads/import/${relativePath.replace(/\\/g, '/')}`;

    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, file.buffer);

    this.logger.debug(`File saved to: ${filePath}`);

    // Create import job (will process ZIP later in worker)
    const job = await this.importJobService.create({
      fileUrl,
      fileName: originalname,
      fileSize: file.size,
      type: ImportFileType.ZIP,
      totalRows: 0, // Will be calculated after extraction
      createdBy: options?.createdBy,
      mode: options?.mode ?? undefined,
      warehouseId: options?.warehouseId ?? undefined,
      originalFilePath: relativePath.replace(/\\/g, '/'),
      importType: options?.importType,
    });

    this.logger.log(`ZIP upload complete: job ${job.id}`);

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
   * Get CSV template content
   */
  async getTemplate(cellId?: string): Promise<string> {
    // Base columns that are always present
    const baseHeaders = ['productName', 'sku', 'cell', 'price', 'stock'];

    if (!cellId) {
      // Fallback to a generic template when no cell is provided
      const headers = [
        'productName',
        'sku',
        'cell',
        'diameter',
        'length',
        'material',
        'finish',
        'price',
        'stock',
      ];

      const exampleRow = [
        'Hex Bolt M8',
        'BOLT-M8-20-ZINC',
        'hex-bolts-standard',
        '8',
        '20',
        'steel',
        'zinc',
        '0.50',
        '1000',
      ];

      const additionalRows = [
        [
          'Hex Bolt M8',
          'BOLT-M8-25-ZINC',
          'hex-bolts-standard',
          '8',
          '25',
          'steel',
          'zinc',
          '0.55',
          '1000',
        ],
        [
          'Hex Bolt M10',
          'BOLT-M10-30-ZINC',
          'hex-bolts-standard',
          '10',
          '30',
          'steel',
          'zinc',
          '0.75',
          '500',
        ],
      ];

      return [
        headers.join(','),
        exampleRow.join(','),
        ...additionalRows.map((r) => r.join(',')),
      ].join('\n');
    }

    // Cell-specific template: include dynamic attribute columns based on assigned attributes
    const cell = await this.cellRepository.findById(cellId);
    const cellSlug = cell?.slug ?? 'unknown-cell';

    const cellAttributes = await this.cellRepository.getAttributes(cellId);
    const attributeHeaders = cellAttributes
      .map((ca) => ca.attribute)
      .filter((attr): attr is { slug: string } => Boolean(attr && (attr as any).slug))
      .map((attr) => (attr as any).slug as string);

    const headers = [
      ...baseHeaders.slice(0, 3), // productName, sku, cell
      ...attributeHeaders,
      ...baseHeaders.slice(3), // price, stock
    ];

    const exampleRow = [
      'Example Product',
      'SKU-001',
      cellSlug,
      ...attributeHeaders.map(() => ''),
      '0.50',
      '1000',
    ];

    return [headers.join(','), exampleRow.join(',')].join('\n');
  }

  /**
   * Get CSV template headers and description
   */
  async getTemplateInfo(cellId?: string) {
    if (!cellId) {
      return {
        filename: 'product-import-template.csv',
        headers: [
          { name: 'productName', required: true, description: 'Product name' },
          { name: 'sku', required: true, description: 'Unique SKU' },
          {
            name: 'cell',
            required: true,
            description: 'Cell slug (e.g., hex-bolts-standard)',
          },
          { name: 'diameter', required: false, description: 'Numeric attribute' },
          { name: 'length', required: false, description: 'Numeric attribute' },
          { name: 'material', required: false, description: 'Text/enum attribute' },
          { name: 'finish', required: false, description: 'Text/enum attribute' },
          { name: 'price', required: true, description: 'Unit price' },
          { name: 'stock', required: true, description: 'Stock quantity' },
        ],
        description:
          'Template for bulk product import. Additional columns map to attribute slugs dynamically.',
      };
    }

    const cellAttributes = await this.cellRepository.getAttributes(cellId);

    const baseHeaders = [
      { name: 'productName', required: true, description: 'Product name' },
      { name: 'sku', required: true, description: 'Unique SKU' },
      {
        name: 'cell',
        required: true,
        description: 'Cell slug (e.g., hex-bolts-standard)',
      },
    ];

    const attributeHeaders = cellAttributes
      .map((ca) => ca.attribute)
      .filter(
        (attr): attr is { slug: string; name: string; isRequired?: boolean } =>
          Boolean(attr && (attr as any).slug && (attr as any).name),
      )
      .map((attr) => ({
        name: (attr as any).slug as string,
        required: Boolean((attr as any).isRequired),
        description: `Attribute: ${(attr as any).name as string}`,
      }));

    const tailHeaders = [
      { name: 'price', required: true, description: 'Unit price' },
      { name: 'stock', required: true, description: 'Stock quantity' },
    ];

    return {
      filename: 'product-import-template.csv',
      headers: [...baseHeaders, ...attributeHeaders, ...tailHeaders],
      description:
        'Template for bulk product import into the selected cell. Attribute columns are generated from the cell schema.',
    };
  }

  /**
   * Clean up uploaded file after processing
   */
  async cleanupFile(fileUrl: string): Promise<void> {
    try {
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cleanup file ${fileUrl}: ${errorMessage}`);
    }
  }

  /**
   * Read file stream from local filesystem
   */
  readFileStream(fileUrl: string): Readable {
    const fileName = path.basename(fileUrl);
    const filePath = path.join(this.uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${fileUrl}`);
    }

    return fs.createReadStream(filePath);
  }
}
