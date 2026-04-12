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
import { CacheInvalidationService } from '@core/cache';
import { NextJsRevalidationService } from '@core/cache';

export interface CategoryImportResult {
  categoriesCreated: number;
  categoriesUpdated: number;
  cellsCreated: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  skippedItems: Array<{
    rowNumber: number;
    name: string;
    type: 'CATEGORY' | 'CELL';
    reason: string;
    sku?: string;
  }>;
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
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly nextJsRevalidation: NextJsRevalidationService,
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
   * Generate a unique slug by appending incrementing suffix if needed.
   * e.g. "test-category" -> "test-category-2" -> "test-category-3"
   */
  private async findUniqueSlug(
    baseSlug: string,
    findBySlug: (slug: string) => Promise<any>,
  ): Promise<string> {
    const existing = await findBySlug(baseSlug);
    if (!existing) {
      return baseSlug;
    }

    for (let i = 2; i <= 100; i++) {
      const candidate = `${baseSlug}-${i}`;
      const collision = await findBySlug(candidate);
      if (!collision) {
        return candidate;
      }
    }

    throw new Error(`Could not find unique slug for "${baseSlug}" after 100 attempts`);
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
      categoriesUpdated: 0,
      cellsCreated: 0,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      skippedRows: 0,
      skippedItems: [],
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
              
              // Track skipped item
              result.skippedRows++;
              result.skippedItems.push({
                rowNumber: row.rowNumber,
                name: categoryName,
                type: 'CATEGORY',
                reason: 'Category already exists',
                sku: existingCategory.sku || undefined,
              });
              
              // Store skipped item in database for persistence
              await this.importErrorRepository.create({
                jobId,
                rowNumber: row.rowNumber,
                message: `Skipped: Category already exists (${existingCategory.sku})`,
                rawData: rowData,
                sourceFile: filePath,
              });
              
              this.logger.debug(`Skipped existing category: ${categoryName} (${existingCategory.sku})`);
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
        `Category CREATE import completed: ${result.categoriesCreated} categories created, ${result.skippedRows} skipped, ${result.failedRows} errors`,
      );

      // Invalidate Redis caches and trigger Next.js ISR revalidation
      await this.cacheInvalidation.invalidateCatalog('category-import-create');
      await this.nextJsRevalidation.revalidateTags(['catalog'], 'category-import-create');

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
      categoriesUpdated: 0,
      cellsCreated: 0,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      skippedRows: 0,
      skippedItems: [],
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
          const description = rowData.description?.trim() || null;

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
            // Check if a cell with this slug already exists under the same parent (true duplicate)
            const existingCell = await this.cellRepo.findBySlug(slug);
            if (existingCell && existingCell.categoryId === parentCategory.id) {
              result.skippedRows++;
              result.skippedItems.push({
                rowNumber: row.rowNumber,
                name,
                type: 'CELL',
                reason: 'Cell already exists under this parent',
                sku: existingCell.sku || undefined,
              });

              await this.importErrorRepository.create({
                jobId,
                rowNumber: row.rowNumber,
                message: `Skipped: Cell "${name}" already exists under ${parentSku} (${existingCell.sku})`,
                rawData: rowData,
                sourceFile: filePath,
              });

              this.logger.debug(`Skipped existing cell: ${name} (${existingCell.sku}) under ${parentSku}`);

              await this.progressService.updateProgress({
                jobId,
                processedRows: result.processedRows,
                successRows: result.successRows,
                failedRows: result.failedRows,
                lastProcessedRow: row.rowNumber,
              });
              continue;
            }

            // Slug collision with a different parent — deduplicate the slug
            const uniqueSlug = existingCell
              ? await this.findUniqueSlug(slug, (s) => this.cellRepo.findBySlug(s))
              : slug;

            const cellSku = this.generateSKU('C');
            const cell = await this.cellRepo.create({
              name,
              slug: uniqueSlug,
              sku: cellSku,
              description,
              sortOrder: 0,
              isActive: true,
              category: { connect: { id: parentCategory.id } },
              imageUrl: null,
            });

            result.cellsCreated++;
            result.successRows++;

            if (uniqueSlug !== slug) {
              this.logger.debug(`Slug collision resolved: ${slug} -> ${uniqueSlug}`);
            }
            this.logger.debug(`Created cell: ${name} (${cell.sku}) under ${parentSku}`);

          } else {
            // Check if a category with this slug already exists under the same parent (true duplicate)
            const existingCategory = await this.categoryRepo.findBySlug(slug);
            if (existingCategory && existingCategory.parentId === parentCategory.id) {
              result.skippedRows++;
              result.skippedItems.push({
                rowNumber: row.rowNumber,
                name,
                type: 'CATEGORY',
                reason: 'Category already exists under this parent',
                sku: existingCategory.sku || undefined,
              });

              await this.importErrorRepository.create({
                jobId,
                rowNumber: row.rowNumber,
                message: `Skipped: Category "${name}" already exists under ${parentSku} (${existingCategory.sku})`,
                rawData: rowData,
                sourceFile: filePath,
              });

              this.logger.debug(`Skipped existing category: ${name} (${existingCategory.sku}) under ${parentSku}`);

              await this.progressService.updateProgress({
                jobId,
                processedRows: result.processedRows,
                successRows: result.successRows,
                failedRows: result.failedRows,
                lastProcessedRow: row.rowNumber,
              });
              continue;
            }

            // Slug collision with a different parent — deduplicate the slug
            const uniqueSlug = existingCategory
              ? await this.findUniqueSlug(slug, (s) => this.categoryRepo.findBySlug(s))
              : slug;

            const catSku = this.generateSKU();
            const path = `${parentCategory.path}.${uniqueSlug}`;

            const category = await this.categoryRepo.create({
              name,
              slug: uniqueSlug,
              description,
              parentId: parentCategory.id,
              path,
              imageUrl: null,
              sortOrder: 0,
              isActive: true,
              sku: catSku,
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
        `Category UPDATE import completed: ${result.categoriesCreated} categories, ${result.cellsCreated} cells created, ${result.skippedRows} skipped, ${result.failedRows} errors`,
      );

      // Invalidate Redis caches and trigger Next.js ISR revalidation
      await this.cacheInvalidation.invalidateCatalog('category-import-update');
      await this.nextJsRevalidation.revalidateTags(['catalog'], 'category-import-update');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Category UPDATE import failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      await this.importJobService.markAsFailed(jobId);
      throw error;
    }

    return result;
  }

  /**
   * Process EDIT import - parse CSV, find by SKU, update name and regenerate slug
   * Supports both Category and Cell SKUs
   */
  async processEditImport(jobId: string, filePath: string): Promise<CategoryImportResult> {
    this.logger.log(`Processing category EDIT import for job: ${jobId}`);

    const result: CategoryImportResult = {
      categoriesCreated: 0,
      categoriesUpdated: 0,
      cellsCreated: 0,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      skippedRows: 0,
      skippedItems: [],
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
          const sku = rowData.sku?.trim();
          const newName = rowData.new_name?.trim();
          const description = rowData.description?.trim() || null;

          if (!sku) {
            throw new Error('SKU is required');
          }
          if (!newName && description === null) {
            throw new Error('At least one of new_name or description is required');
          }

          // Generate new slug from new_name only if provided
          const newSlug = newName ? this.generateSlug(newName) : null;

          // Try to find category by SKU first
          const category = await this.categoryRepo.findBySku(sku);

          if (category) {
            if (newSlug) {
              // Check for slug conflicts (skip if same slug as current)
              if (newSlug !== category.slug) {
                const existingBySlug = await this.categoryRepo.findBySlug(newSlug);
                if (existingBySlug && existingBySlug.id !== category.id) {
                  throw new Error(`Slug "${newSlug}" is already in use by another category`);
                }
              }
            }

            // Update category
            const updateData: { name?: string; slug?: string; description?: string | null } = {};
            if (newName) {
              updateData.name = newName;
              updateData.slug = newSlug!;
            }
            if (description !== null) {
              updateData.description = description;
            }
            await this.categoryRepo.update(category.id, updateData);

            result.categoriesUpdated++;
            result.successRows++;

            this.logger.debug(`Updated category: ${sku}${newName ? ` -> ${newName} (${newSlug})` : ''}`);
          } else {
            // Try to find cell by SKU
            const cell = await this.cellRepo.findBySku(sku);
            if (!cell) {
              throw new Error(`Category or Cell with SKU ${sku} not found`);
            }

            if (newSlug) {
              // Check for slug conflicts (skip if same slug as current)
              if (newSlug !== cell.slug) {
                const existingBySlug = await this.cellRepo.findBySlug(newSlug);
                if (existingBySlug && existingBySlug.id !== cell.id) {
                  throw new Error(`Slug "${newSlug}" is already in use by another cell`);
                }
              }
            }

            // Update cell
            const cellUpdateData: { name?: string; slug?: string; description?: string | null } = {};
            if (newName) {
              cellUpdateData.name = newName;
              cellUpdateData.slug = newSlug!;
            }
            if (description !== null) {
              cellUpdateData.description = description;
            }
            await this.cellRepo.update(cell.id, cellUpdateData);

            result.categoriesUpdated++;
            result.successRows++;

            this.logger.debug(`Updated cell: ${sku}${newName ? ` -> ${newName} (${newSlug})` : ''}`);
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
        `Category EDIT import completed: ${result.categoriesUpdated} items updated, ${result.failedRows} errors`,
      );

      // Invalidate Redis caches and trigger Next.js ISR revalidation
      await this.cacheInvalidation.invalidateCatalog('category-import-edit');
      await this.nextJsRevalidation.revalidateTags(['catalog'], 'category-import-edit');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Category EDIT import failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      await this.importJobService.markAsFailed(jobId);
      throw error;
    }

    return result;
  }
}
