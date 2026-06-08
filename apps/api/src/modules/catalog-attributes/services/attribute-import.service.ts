import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CsvParserService } from '@modules/import/services/csv-parser.service';
import { AttributeDefinitionService } from './attribute-definition.service';
import { AttributeOptionService } from './attribute-option.service';
import { AttributeDefinitionRepository } from '../repositories/attribute-definition.repository';
import { AttributeOptionRepository } from '../repositories/attribute-option.repository';
import { AttributeDataType, AttributeFilterType } from '../entities';
import { ExtractedFiles } from '@modules/import/dto';
import { ImportJobService } from '@modules/import/services/import-job.service';

export interface AttributeImportSummary {
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedAttributes: string[];
  createdAttributes: string[];
  updatedAttributes: string[];
  createdOptions: number;
  updatedOptions: number;
  errors: Array<{
    rowNumber: number;
    slug?: string;
    message: string;
  }>;
}

export interface ImportOptions {
  validateOnly?: boolean;
  conflictMode?: 'skip' | 'replace' | 'add_anyway';
  createdBy?: string;
}

@Injectable()
export class AttributeImportService {
  private readonly logger = new Logger(AttributeImportService.name);

  constructor(
    private readonly csvParserService: CsvParserService,
    private readonly attributeDefinitionService: AttributeDefinitionService,
    private readonly attributeOptionService: AttributeOptionService,
    private readonly attributeRepo: AttributeDefinitionRepository,
    private readonly optionRepo: AttributeOptionRepository,
    private readonly importJobService: ImportJobService,
  ) {}

  /**
   * Generate a slug from a name
   */
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'attribute';
  }

  /**
   * Generate a unique slug, adding a suffix if needed
   */
  private async generateUniqueSlug(baseName: string): Promise<string> {
    const baseSlug = this.generateSlugFromName(baseName);
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.attributeRepo.findBySlug(slug);
      if (!existing) {
        return slug;
      }
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  }

  /**
   * Process attribute import from extracted files (called by worker)
   */
  async processAttributeImport(jobId: string, extractedFiles: ExtractedFiles): Promise<void> {
    this.logger.log(`Processing attribute import job: ${jobId}`);

    try {
      await this.importJobService.markAsProcessing(jobId, `worker-${process.pid}`);

      // Count total rows for progress tracking
      let totalRows = 0;
      if (extractedFiles.attributes) {
        const { createReadStream } = require('fs');
        const rowStream = createReadStream(extractedFiles.attributes);
        totalRows += await this.csvParserService.countRows(rowStream);
      }
      if (extractedFiles.attributeOptions) {
        const { createReadStream } = require('fs');
        const rowStream = createReadStream(extractedFiles.attributeOptions);
        totalRows += await this.csvParserService.countRows(rowStream);
      }

      await this.importJobService.updateTotalRows(jobId, totalRows);

      // Process the import
      const result = await this.importFromFiles(
        extractedFiles.attributes ?? null,
        extractedFiles.attributeOptions ?? null,
        { validateOnly: false },
      );

      // Update progress with final counts before marking completed
      await this.importJobService.updateProgress(jobId, {
        processedRows: result.totalRows,
        successRows: result.successRows,
        failedRows: result.failedRows,
      });

      await this.importJobService.markAsCompleted(jobId);

      this.logger.log(
        `Attribute import job ${jobId} completed: ${result.successRows} success, ${result.failedRows} failed`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Attribute import job ${jobId} failed: ${errorMessage}`);

      await this.importJobService.markAsFailed(jobId);

      throw error;
    }
  }

  /**
   * Main import method - handles both CSV and ZIP uploads
   */
  async importFromFiles(
    attributesFile: string | null,
    optionsFile: string | null,
    options: ImportOptions = {},
  ): Promise<AttributeImportSummary> {
    this.logger.log('Starting attribute import process');

    const summary: AttributeImportSummary = {
      totalRows: 0,
      successRows: 0,
      failedRows: 0,
      skippedAttributes: [],
      createdAttributes: [],
      updatedAttributes: [],
      createdOptions: 0,
      updatedOptions: 0,
      errors: [],
    };

    try {
      // Step 1: Parse and validate attributes CSV
      const attributeResult = attributesFile
        ? await this.parseAndValidateAttributes(attributesFile, options.conflictMode)
        : { valid: [], invalid: [], duplicateSlugs: [] };

      // Step 2: Parse and validate options CSV
      const optionResult = optionsFile
        ? await this.parseAndValidateOptions(optionsFile)
        : { valid: [], invalid: [], invalidAttributeSlugs: [] };

      // Step 3: Check for validation errors
      summary.errors.push(...attributeResult.invalid.map((err) => ({
        rowNumber: err.rowNumber,
        slug: err.slug,
        message: err.errors.join('; '),
      })));

      summary.errors.push(...optionResult.invalid.map((err) => ({
        rowNumber: err.rowNumber,
        message: `Option for ${err.attributeSlug}: ${err.errors.join('; ')}`,
      })));

      if (summary.errors.length > 0) {
        this.logger.error(`Found ${summary.errors.length} validation errors`);
        return summary;
      }

      // Step 4: If validateOnly, return early
      if (options.validateOnly) {
        this.logger.log('Validation-only mode, skipping import');
        return summary;
      }

      // Step 5: Import attributes
      const attributeMap = new Map<string, string>();
      for (const attr of attributeResult.valid) {
        const result = await this.upsertAttribute(attr, options);
        if (result.skipped) {
          // Skip tracking - track skipped attribute by name
          summary.skippedAttributes.push(attr.name);
          continue;
        }
        if (result.success) {
          attributeMap.set(attr.slug, result.attributeId!);
          if (result.created) {
            summary.createdAttributes.push(attr.name);
          } else {
            summary.updatedAttributes.push(attr.name);
          }
          summary.successRows++;
        } else {
          summary.failedRows++;
          summary.errors.push({
            rowNumber: attr.rowNumber!,
            slug: attr.slug,
            message: result.error || 'Unknown error',
          });
        }
      }

      summary.totalRows += attributeResult.valid.length;

      // Step 6: Import options
      for (const opt of optionResult.valid) {
        const attributeId = attributeMap.get(opt.attributeSlug);
        if (!attributeId) {
          summary.errors.push({
            rowNumber: opt.rowNumber!,
            message: `Attribute not found: ${opt.attributeSlug}`,
          });
          summary.failedRows++;
          continue;
        }

        const result = await this.upsertOption(attributeId, opt);
        if (result.success) {
          if (result.created) {
            summary.createdOptions++;
          } else {
            summary.updatedOptions++;
          }
        } else {
          summary.failedRows++;
          summary.errors.push({
            rowNumber: opt.rowNumber!,
            message: `Option for ${opt.attributeSlug}: ${result.error || 'Unknown error'}`,
          });
        }
      }

      this.logger.log(
        `Import completed: ${summary.successRows} success, ${summary.failedRows} failed`,
      );
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Import failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new BadRequestException(`Import failed: ${errorMessage}`);
    }
  }

  /**
   * Parse and validate attributes CSV
   */
  private async parseAndValidateAttributes(filePath: string, conflictMode?: string): Promise<{
    valid: Array<{
      name: string;
      slug: string;
      dataType: string;
      group?: string;
      sortOrder: number;
      isFilterable: boolean;
      filterType?: string;
      rowNumber?: number;
    }>;
    invalid: Array<{
      rowNumber: number;
      slug: string;
      errors: string[];
    }>;
    duplicateSlugs: string[];
  }> {
    this.logger.debug(`Parsing attributes CSV: ${filePath}`);
    const stream = require('fs').createReadStream(filePath);
    const valid: any[] = [];
    const invalid: Array<{
      rowNumber: number;
      slug: string;
      errors: string[];
    }> = [];
    const nameSet = new Set<string>();
    const duplicateNames: string[] = [];

    // Only deduplicate within file if NOT using add_anyway mode
    const shouldDeduplicate = conflictMode !== 'add_anyway';

    try {
      for await (const { rowNumber, data } of this.csvParserService.parseStream(stream)) {
        const name = data.name?.trim() || '';
        
        // Check for duplicate names within the file (skip if add_anyway mode)
        if (shouldDeduplicate && nameSet.has(name.toLowerCase())) {
          duplicateNames.push(name);
          continue;
        }
        nameSet.add(name.toLowerCase());

        const attr: any = {
          rowNumber,
          name,
          slug: '', // Will be auto-generated
          dataType: data.dataType?.trim() || '',
          group: data.group?.trim() || '',
          sortOrder: 0, // Will be auto-assigned alphabetically
          isFilterable: data.isFilterable?.toLowerCase() === 'true',
          filterType: data.filterType?.trim() || '',
        };

        // Validate
        const errors = this.validateAttribute(attr);
        if (errors.length > 0) {
          invalid.push({ rowNumber, slug: attr.name, errors });
        } else {
          valid.push(attr);
        }
      }

      // Sort alphabetically by name and assign sortOrder
      valid.sort((a, b) => a.name.localeCompare(b.name));
      valid.forEach((attr, index) => {
        attr.sortOrder = index + 1;
      });

      return { valid, invalid, duplicateSlugs: duplicateNames };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to parse attributes CSV: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Parse and validate attribute options CSV
   */
  private async parseAndValidateOptions(filePath: string): Promise<{
    valid: Array<{
      attributeSlug: string;
      label: string;
      value: string;
      sortOrder: number;
      rowNumber?: number;
    }>;
    invalid: Array<{
      rowNumber: number;
      attributeSlug: string;
      errors: string[];
    }>;
    invalidAttributeSlugs: string[];
  }> {
    this.logger.debug(`Parsing attribute options CSV: ${filePath}`);
    const stream = require('fs').createReadStream(filePath);
    const valid: any[] = [];
    const invalid: Array<{
      rowNumber: number;
      attributeSlug: string;
      errors: string[];
    }> = [];
    const invalidAttributeSlugs: string[] = [];

    try {
      for await (const { rowNumber, data } of this.csvParserService.parseStream(stream)) {
        const opt: any = {
          rowNumber,
          attributeSlug: data.attributeSlug?.trim() || '',
          label: data.label?.trim() || '',
          value: data.value?.trim() || '',
          sortOrder: data.sortOrder ? parseInt(data.sortOrder, 10) : 0,
        };

        // Validate
        const errors = this.validateAttributeOption(opt);
        if (errors.length > 0) {
          invalid.push({ rowNumber, attributeSlug: opt.attributeSlug, errors });
        } else {
          valid.push(opt);
        }
      }

      return { valid, invalid, invalidAttributeSlugs };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to parse options CSV: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Validate attribute data
   */
  private validateAttribute(attr: any): string[] {
    const errors: string[] = [];

    if (!attr.name || attr.name.length === 0) {
      errors.push('name is required');
    }

    // Slug is auto-generated, no validation needed

    if (!attr.dataType) {
      errors.push('dataType is required');
    } else if (
      !['number', 'text', 'enum', 'boolean'].includes(attr.dataType)
    ) {
      errors.push('dataType must be number, text, enum, or boolean');
    }

    if (attr.isFilterable && !attr.filterType) {
      errors.push('filterType is required when isFilterable is true');
    }

    if (attr.filterType && !attr.isFilterable) {
      errors.push('filterType requires isFilterable to be true');
    }

    // Validate filter type matches data type
    if (attr.filterType) {
      const validFilterTypes = this.getValidFilterTypes(attr.dataType);
      if (!validFilterTypes.includes(attr.filterType)) {
        errors.push(
          `filterType ${attr.filterType} is not valid for dataType ${attr.dataType}`,
        );
      }
    }

    return errors;
  }

  /**
   * Validate attribute option data
   */
  private validateAttributeOption(opt: any): string[] {
    const errors: string[] = [];

    if (!opt.attributeSlug || opt.attributeSlug.length === 0) {
      errors.push('attributeSlug is required');
    } else if (!/^[a-z0-9-]+$/.test(opt.attributeSlug)) {
      errors.push('attributeSlug must be lowercase alphanumeric with hyphens only');
    }

    if (!opt.label || opt.label.length === 0) {
      errors.push('label is required');
    }

    if (!opt.value || opt.value.length === 0) {
      errors.push('value is required');
    }

    return errors;
  }

  /**
   * Get valid filter types for a data type
   */
  private getValidFilterTypes(dataType: string): string[] {
    switch (dataType) {
      case 'number':
        return ['RANGE'];
      case 'enum':
        return ['CHECKBOX', 'SELECT'];
      case 'boolean':
        return [];
      case 'text':
        return ['CHECKBOX', 'SELECT'];
      default:
        return [];
    }
  }

  /**
   * Upsert attribute (create or update)
   */
  private async upsertAttribute(
    attr: any,
    options: ImportOptions,
  ): Promise<{ success: boolean; created: boolean; skipped: boolean; attributeId?: string; error?: string }> {
    try {
      // Check if attribute exists by name
      const { data: existingAttributes } = await this.attributeRepo.findAll();
      const existing = existingAttributes.find(a => a.name.toLowerCase() === attr.name.toLowerCase());

      const conflictMode = options.conflictMode || 'replace';

      if (existing) {
        // Handle conflict based on conflictMode
        switch (conflictMode) {
          case 'skip':
            // Skip existing attribute without updating
            return { success: false, created: false, skipped: true, attributeId: existing.id };

          case 'replace':
            // Update existing attribute
            await this.attributeDefinitionService.update(existing.id, {
              name: attr.name,
              dataType: attr.dataType as unknown as AttributeDataType,
              group: attr.group || null,
              sortOrder: attr.sortOrder ?? 0,
              filterType: attr.filterType as unknown as AttributeFilterType || null,
              isFilterable: attr.isFilterable ?? false,
              updatedBy: options.createdBy,
            });

            return { success: true, created: false, skipped: false, attributeId: existing.id };

          case 'add_anyway':
            // Always create new, generate unique slug
            const slug = await this.generateUniqueSlug(attr.name);
            const created = await this.attributeDefinitionService.create({
              name: attr.name,
              slug,
              dataType: attr.dataType as unknown as AttributeDataType,
              group: attr.group || null,
              sortOrder: attr.sortOrder ?? 0,
              filterType: attr.filterType as unknown as AttributeFilterType || null,
              isFilterable: attr.isFilterable ?? false,
              createdBy: options.createdBy,
            });

            return { success: true, created: true, skipped: false, attributeId: created.id };

          default:
            throw new BadRequestException(`Invalid conflict mode: ${conflictMode}`);
        }
      } else {
        // Attribute doesn't exist, create new
        const slug = await this.generateUniqueSlug(attr.name);
        const created = await this.attributeDefinitionService.create({
          name: attr.name,
          slug,
          dataType: attr.dataType as unknown as AttributeDataType,
          group: attr.group || null,
          sortOrder: attr.sortOrder ?? 0,
          filterType: attr.filterType as unknown as AttributeFilterType || null,
          isFilterable: attr.isFilterable ?? false,
          createdBy: options.createdBy,
        });

        return { success: true, created: true, skipped: false, attributeId: created.id };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upsert attribute ${attr.name}: ${errorMessage}`);
      return { success: false, created: false, skipped: false, error: errorMessage };
    }
  }

  /**
   * Upsert option (create or update)
   */
  private async upsertOption(
    attributeId: string,
    opt: any,
  ): Promise<{ success: boolean; created: boolean; error?: string }> {
    try {
      // Find existing option by attributeId and value
      const options = await this.optionRepo
        .getClient()
        .attributeOption
        .findMany({
          where: { attributeId, value: opt.value },
        });

      if (options.length > 0) {
        // Update existing
        await this.attributeOptionService.update(options[0].id, {
          label: opt.label,
          sortOrder: opt.sortOrder ?? 0,
        });
        return { success: true, created: false };
      } else {
        // Create new
        await this.attributeOptionService.create({
          attributeId,
          label: opt.label,
          value: opt.value,
          sortOrder: opt.sortOrder ?? 0,
        });
        return { success: true, created: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to upsert option for attribute ${attributeId}: ${errorMessage}`,
      );
      return { success: false, created: false, error: errorMessage };
    }
  }

  /**
   * Generate CSV template (only attributes.csv - options are managed separately)
   */
  async generateTemplate(): Promise<{
    attributesCsv: string;
  }> {
    const attributesCsv = [
      'name,dataType,group,isFilterable,filterType',
      'Thread Size,enum,Technical Specs,true,CHECKBOX',
      'Material,enum,Material,true,CHECKBOX',
      'Diameter,number,Dimensions,true,RANGE',
      'Length,number,Dimensions,true,RANGE',
      'Finish,enum,Material,true,CHECKBOX',
      'Color,text,Appearance,false,',
    ].join('\n');

    return { attributesCsv };
  }
}
