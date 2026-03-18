import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CsvParserService } from '@modules/import/services/csv-parser.service';
import { AttributeDefinitionService } from './attribute-definition.service';
import { AttributeOptionService } from './attribute-option.service';
import { AttributeDefinitionRepository } from '../repositories/attribute-definition.repository';
import { UnitDefinitionRepository } from '../repositories/unit-definition.repository';
import { AttributeOptionRepository } from '../repositories/attribute-option.repository';
import { AttributeDataType, AttributeFilterType } from '../entities';
import { ExtractedFiles } from '@modules/import/dto';
import { ImportJobService } from '@modules/import/services/import-job.service';

export interface AttributeImportSummary {
  totalRows: number;
  successRows: number;
  failedRows: number;
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
    private readonly unitRepo: UnitDefinitionRepository,
    private readonly optionRepo: AttributeOptionRepository,
    private readonly importJobService: ImportJobService,
  ) {}

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
      createdAttributes: [],
      updatedAttributes: [],
      createdOptions: 0,
      updatedOptions: 0,
      errors: [],
    };

    try {
      // Step 1: Parse and validate attributes CSV
      const attributeResult = attributesFile
        ? await this.parseAndValidateAttributes(attributesFile)
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
        if (result.success) {
          attributeMap.set(attr.slug, result.attributeId!);
          if (result.created) {
            summary.createdAttributes.push(attr.slug);
          } else {
            summary.updatedAttributes.push(attr.slug);
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
  private async parseAndValidateAttributes(filePath: string): Promise<{
    valid: Array<{
      name: string;
      slug: string;
      dataType: string;
      group?: string;
      sortOrder: number;
      isFilterable: boolean;
      filterType?: string;
      unitSymbol?: string;
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
    const slugSet = new Set<string>();
    const duplicateSlugs: string[] = [];

    try {
      for await (const { rowNumber, data } of this.csvParserService.parseStream(stream)) {
        const attr: any = {
          rowNumber,
          name: data.name?.trim() || '',
          slug: data.slug?.trim() || '',
          dataType: data.dataType?.trim() || '',
          group: data.group?.trim() || '',
          sortOrder: data.sortOrder ? parseInt(data.sortOrder, 10) : 0,
          isFilterable: data.isFilterable?.toLowerCase() === 'true',
          filterType: data.filterType?.trim() || '',
          unitSymbol: data.unitSymbol?.trim() || '',
        };

        // Check for duplicate slugs
        if (slugSet.has(attr.slug)) {
          duplicateSlugs.push(attr.slug);
          continue;
        }
        slugSet.add(attr.slug);

        // Validate
        const errors = this.validateAttribute(attr);
        if (errors.length > 0) {
          invalid.push({ rowNumber, slug: attr.slug, errors });
        } else {
          valid.push(attr);
        }
      }

      return { valid, invalid, duplicateSlugs };
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

    if (!attr.slug || attr.slug.length === 0) {
      errors.push('slug is required');
    } else if (!/^[a-z0-9-]+$/.test(attr.slug)) {
      errors.push('slug must be lowercase alphanumeric with hyphens only');
    }

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

    // Validate unit symbol is only for number types
    if (attr.unitSymbol && attr.dataType !== 'number') {
      errors.push('unitSymbol can only be used with number dataType');
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
        return [];
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
  ): Promise<{ success: boolean; created: boolean; attributeId?: string; error?: string }> {
    try {
      // Check if attribute exists by slug
      const existing = await this.attributeRepo.findBySlug(attr.slug);

      // Resolve unit symbol to unit ID
      let unitId: string | undefined;
      if (attr.unitSymbol) {
        const unit = await this.unitRepo.findBySymbol(attr.unitSymbol);
        if (unit) {
          unitId = unit.id;
        }
      }

      if (existing) {
        // Update existing
        await this.attributeDefinitionService.update(existing.id, {
          name: attr.name,
          dataType: attr.dataType as unknown as AttributeDataType,
          group: attr.group || null,
          sortOrder: attr.sortOrder ?? 0,
          filterType: attr.filterType as unknown as AttributeFilterType || null,
          unitId: unitId || null,
          isFilterable: attr.isFilterable ?? false,
          updatedBy: options.createdBy,
        });

        return { success: true, created: false, attributeId: existing.id };
      } else {
        // Create new
        const created = await this.attributeDefinitionService.create({
          name: attr.name,
          slug: attr.slug,
          dataType: attr.dataType as unknown as AttributeDataType,
          group: attr.group || null,
          sortOrder: attr.sortOrder ?? 0,
          filterType: attr.filterType as unknown as AttributeFilterType || null,
          unitId: unitId || null,
          isFilterable: attr.isFilterable ?? false,
          createdBy: options.createdBy,
        });

        return { success: true, created: true, attributeId: created.id };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upsert attribute ${attr.slug}: ${errorMessage}`);
      return { success: false, created: false, error: errorMessage };
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
   * Generate CSV template
   */
  async generateTemplate(): Promise<{
    attributesCsv: string;
    optionsCsv: string;
  }> {
    const attributesCsv = [
      'name,slug,dataType,group,sortOrder,isFilterable,filterType,unitSymbol',
      'Thread Size,thread-size,enum,Technical Specs,1,true,CHECKBOX,',
      'Material,material,enum,Material,2,true,CHECKBOX,',
      'Diameter,diameter,number,Dimensions,3,true,RANGE,mm',
      'Length,length,number,Dimensions,4,true,RANGE,mm',
      'Finish,finish,enum,Material,5,true,CHECKBOX,',
    ].join('\n');

    const optionsCsv = [
      'attributeSlug,label,value,sortOrder',
      'material,Steel,steel,1',
      'material,Stainless Steel,stainless-steel,2',
      'material,Aluminum,aluminum,3',
      'material,Brass,brass,4',
      'finish,Zinc,zinc,1',
      'finish,Black Oxide,black-oxide,2',
      'finish,Plain,plain,3',
      'thread-size,1/4-20,1/4-20,1',
      'thread-size,3/8-16,3/8-16,2',
      'thread-size,1/2-13,1/2-13,3',
    ].join('\n');

    return { attributesCsv, optionsCsv };
  }
}
