import { Injectable, Logger } from '@nestjs/common';
import { DatabaseProvider } from '@core/database';
import { CsvParserService } from './csv-parser.service';
import { ImportJobService } from './import-job.service';
import { ImportProgressService } from './import-progress.service';
import { ImportErrorRepository } from '../repositories/import-error.repository';
import { CategoryRepository } from '../../catalog/repositories/category.repository';
import { CellRepository } from '../../cell/repositories/cell.repository';
import { randomBytes } from 'crypto';
import * as fs from 'fs';

export interface CategoryImportResult {
  categoriesCreated: number;
  cellsCreated: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  errors: Array<{
    rowNumber: number;
    message: string;
    rowData: any;
  }>;
}

export interface CategoryCreatedItem {
  id: string;
  name: string;
  sku: string;
  slug: string;
  type: 'CATEGORY' | 'CELL';
}

@Injectable()
export class CategoryImportService {
  private readonly logger = new Logger(CategoryImportService.name);

  constructor(
    private readonly db: DatabaseProvider,
    private readonly csvParserService: CsvParserService,
    private readonly importJobService: ImportJobService,
    private readonly progressService: ImportProgressService,
    private readonly importErrorRepository: ImportErrorRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly cellRepo: CellRepository,
  ) {}

  private generateSKU(prefix: string = 'CG'): string {
    const randomPart = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${randomPart}`;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Validate branch/leaf constraint: under any parent, all children must be of the same type
   */
  private async validateBranchLeafConstraint(
    parentId: string,
    createType: 'CATEGORY' | 'CELL',
  ): Promise<{ valid: boolean; error?: string }> {
    const [childCategoriesCount, childCellsCount] = await Promise.all([
      this.db.category.count({ where: { parentId } }),
      this.db.cell.count({ where: { categoryId: parentId } }),
    ]);

    if (childCategoriesCount > 0 && createType === 'CELL') {
      return {
        valid: false,
        error: 'Cannot add Cell to a branch category (already has category children)',
      };
    }

    if (childCellsCount > 0 && createType === 'CATEGORY') {
      return {
        valid: false,
        error: 'Cannot add child category to a leaf category (already has cells)',
      };
    }

    return { valid: true };
  }

  /**
   * Process CREATE import - parse hierarchical CSV and create categories with auto-generated SKUs
   */
  async processCreateImport(jobId: string, filePath: string): Promise<CategoryImportResult> {
    this.logger.log(`Processing category CREATE import for job: ${jobId}`);

    const result: CategoryImportResult = {
      categoriesCreated: 0,
      cellsCreated: 0,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      errors: [],
    };

    const workerId = `worker-${process.pid}`;
    const createdItems: Map<string, CategoryCreatedItem> = new Map();

    try {
      await this.importJobService.markAsProcessing(jobId, workerId);

      // Count total rows
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const totalRows = await this.csvParserService.countRows(stream);
      await this.importJobService.updateTotalRows(jobId, totalRows);
      this.logger.log(`Total rows to process: ${totalRows}`);

      // Parse CSV
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const rows = await this.csvParserService.parseToArray(fileStream);

      for (const row of rows) {
        result.processedRows++;
        const rowData = row.data;

        try {
          // Extract category path from columns main_branch, branch1, branch2, etc.
          const pathParts: string[] = [];
          for (let i = 0; i <= 6; i++) {
            const key = i === 0 ? 'main_branch' : `branch${i}`;
            const value = rowData[key]?.trim();
            if (value) {
              pathParts.push(value);
            }
          }

          if (pathParts.length === 0) {
            throw new Error('No category path found in row');
          }

          // Build the hierarchy
          let parentId: string | null = null;
          let currentPath = '';

          for (let depth = 0; depth < pathParts.length; depth++) {
            const categoryName = pathParts[depth].trim();
            currentPath = depth === 0 ? categoryName : `${currentPath}.${categoryName}`;

            // Check if we've already created this category at this depth
            const cacheKey = `${parentId || 'root'}-${depth}-${categoryName}`;
            const existingItem = createdItems.get(cacheKey);

            if (existingItem) {
              parentId = existingItem.id;
              continue;
            }

            // Check if category already exists in database
            const slug = this.generateSlug(categoryName);
            const existingCategory = await this.categoryRepo.findBySlug(slug);
            if (existingCategory) {
              parentId = existingCategory.id;
              createdItems.set(cacheKey, {
                id: existingCategory.id,
                name: existingCategory.name,
                sku: existingCategory.sku || '',
                slug: existingCategory.slug,
                type: 'CATEGORY',
              });
              continue;
            }

            // Validate branch/leaf constraint if not root
            if (parentId) {
              const validation = await this.validateBranchLeafConstraint(parentId, 'CATEGORY');
              if (!validation.valid) {
                throw new Error(validation.error);
              }
            }

            // Create category
            const sku = this.generateSKU();
            const category = await this.categoryRepo.create({
              name: categoryName,
              slug,
              description: null,
              parentId,
              path: currentPath,
              imageUrl: null,
              sortOrder: depth,
              isActive: true,
              sku,
            });

            result.categoriesCreated++;
            result.successRows++;

            createdItems.set(cacheKey, {
              id: category.id,
              name: category.name,
              sku: category.sku || '',
              slug: category.slug,
              type: 'CATEGORY',
            });

            parentId = category.id;

            this.logger.debug(
              `Created category at depth ${depth}: ${categoryName} (${category.sku})`,
            );
          }

          // Update progress
          await this.progressService.updateProgress({
            jobId,
            processedRows: result.processedRows,
            successRows: result.successRows,
            failedRows: result.failedRows,
            lastProcessedRow: row.rowNumber,
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.failedRows++;
          result.errors.push({
            rowNumber: row.rowNumber,
            message: errorMessage,
            rowData,
          });

          await this.importErrorRepository.create({
            jobId,
            rowNumber: row.rowNumber,
            message: errorMessage,
            rawData: rowData,
            sourceFile: filePath,
          });

          this.logger.error(`Error processing row ${row.rowNumber}: ${errorMessage}`);
        }
      }

      await this.importJobService.markAsCompleted(jobId);
      this.logger.log(
        `Category CREATE import completed: ${result.categoriesCreated} categories created, ${result.failedRows} errors`,
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Category CREATE import failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      await this.importJobService.markAsFailed(jobId);
      throw error;
    }

    return result;
  }

  /**
   * Process UPDATE import - parse CSV, find by SKU, add children/cells
   */
  async processUpdateImport(jobId: string, filePath: string): Promise<CategoryImportResult> {
    this.logger.log(`Processing category UPDATE import for job: ${jobId}`);

    const result: CategoryImportResult = {
      categoriesCreated: 0,
      cellsCreated: 0,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      errors: [],
    };

    const workerId = `worker-${process.pid}`;

    try {
      await this.importJobService.markAsProcessing(jobId, workerId);

      // Count total rows
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const totalRows = await this.csvParserService.countRows(stream);
      await this.importJobService.updateTotalRows(jobId, totalRows);
      this.logger.log(`Total rows to process: ${totalRows}`);

      // Parse CSV
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const rows = await this.csvParserService.parseToArray(fileStream);

      for (const row of rows) {
        result.processedRows++;
        const rowData = row.data;

        try {
          const parentSku = rowData.sku?.trim();
          const name = rowData.name?.trim();
          const cellMarker = rowData.cell?.trim();

          if (!parentSku) {
            throw new Error('Parent SKU is required');
          }
          if (!name) {
            throw new Error('Name is required');
          }

          // Find parent category by SKU
          const parentCategory = await this.categoryRepo.findBySku(parentSku);
          if (!parentCategory) {
            throw new Error(`Parent category with SKU ${parentSku} not found`);
          }

          const createType = cellMarker === 'x' ? 'CELL' : 'CATEGORY';
          const slug = this.generateSlug(name);

          // Validate branch/leaf constraint
          const validation = await this.validateBranchLeafConstraint(
            parentCategory.id,
            createType,
          );
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          if (createType === 'CELL') {
            // Create cell
            const existingCell = await this.cellRepo.findBySlug(slug);
            if (existingCell) {
              throw new Error(`Cell with slug ${slug} already exists`);
            }

            const sku = this.generateSKU('C');
            const cell = await this.cellRepo.create({
              name,
              slug,
              sku,
              description: null,
              sortOrder: 0,
              isActive: true,
              category: { connect: { id: parentCategory.id } },
              imageUrl: null,
            });

            result.cellsCreated++;
            result.successRows++;

            this.logger.debug(`Created cell: ${name} (${cell.sku}) under ${parentSku}`);

          } else {
            // Create child category
            const existingCategory = await this.categoryRepo.findBySlug(slug);
            if (existingCategory) {
              throw new Error(`Category with slug ${slug} already exists`);
            }

            const sku = this.generateSKU();
            const path = `${parentCategory.path}.${slug}`;

            const category = await this.categoryRepo.create({
              name,
              slug,
              description: null,
              parentId: parentCategory.id,
              path,
              imageUrl: null,
              sortOrder: 0,
              isActive: true,
              sku,
            });

            result.categoriesCreated++;
            result.successRows++;

            this.logger.debug(`Created category: ${name} (${category.sku}) under ${parentSku}`);
          }

          // Update progress
          await this.progressService.updateProgress({
            jobId,
            processedRows: result.processedRows,
            successRows: result.successRows,
            failedRows: result.failedRows,
            lastProcessedRow: row.rowNumber,
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.failedRows++;
          result.errors.push({
            rowNumber: row.rowNumber,
            message: errorMessage,
            rowData,
          });

          await this.importErrorRepository.create({
            jobId,
            rowNumber: row.rowNumber,
            message: errorMessage,
            rawData: rowData,
            sourceFile: filePath,
          });

          this.logger.error(`Error processing row ${row.rowNumber}: ${errorMessage}`);
        }
      }

      await this.importJobService.markAsCompleted(jobId);
      this.logger.log(
        `Category UPDATE import completed: ${result.categoriesCreated} categories, ${result.cellsCreated} cells created, ${result.failedRows} errors`,
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Category UPDATE import failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      await this.importJobService.markAsFailed(jobId);
      throw error;
    }

    return result;
  }
}
