import { Injectable, Logger } from '@nestjs/common';
import { CellRepository } from '@modules/cell/repositories/cell.repository';
import { AttributeDefinitionRepository } from '@modules/catalog-attributes/repositories/attribute-definition.repository';
import { AttributeOptionRepository } from '@modules/catalog-attributes/repositories/attribute-option.repository';
import { AttributeDataType } from '@modules/catalog-attributes/entities';
import { CsvRow } from './csv-parser.service';

export interface ValidationError {
  rowNumber: number;
  sku?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationContext {
  cellSkuMap: Map<string, string>; // cellSku -> cellId
  cellSlugMap: Map<string, string>; // cellSlug -> cellId
  attributeMap: Map<string, string>; // attributeSlug -> attributeId
  attributeOptionMap: Map<string, string>; // attributeSlug:optionValue -> optionId
  requiredAttributesByCell: Map<string, Set<string>>; // cellId -> Set<attributeSlug>
}

@Injectable()
export class ImportValidationService {
  private readonly logger = new Logger(ImportValidationService.name);

  constructor(
    private readonly cellRepository: CellRepository,
    private readonly attributeDefinitionRepository: AttributeDefinitionRepository,
    private readonly attributeOptionRepository: AttributeOptionRepository,
  ) {}

  /**
   * Build validation context with preloaded maps for performance
   * This avoids 500k DB lookups during large imports
   */
  async buildValidationContext(): Promise<ValidationContext> {
    this.logger.debug('Building validation context...');

    // Load all cells
    const cells = await this.cellRepository.list({ activeOnly: false });
    const cellSkuMap = new Map<string, string>();
    const cellSlugMap = new Map<string, string>();
    for (const cell of cells.cells) {
      if (cell.slug) {
        cellSlugMap.set(cell.slug, cell.id);
      }
      if (cell.sku) {
        cellSkuMap.set(cell.sku, cell.id);
      }
    }

    // Load all attributes
    const attributesResult = await this.attributeDefinitionRepository.findAll();
    const attributes = attributesResult.data;
    const attributeMap = new Map<string, string>();
    for (const attribute of attributes) {
      attributeMap.set(attribute.slug, attribute.id);
    }

    // Load all attribute options for ENUM type attributes
    const attributeOptionMap = new Map<string, string>();
    for (const attribute of attributes) {
      if (attribute.dataType === AttributeDataType.ENUM) {
        // Load options for this attribute
        const options = await this.attributeOptionRepository.findByAttributeId(attribute.id);
        for (const option of options) {
          const key = `${attribute.slug}:${option.value}`;
          attributeOptionMap.set(key, option.id);
        }
      }
    }

    // Load required attributes by cell
    const requiredAttributesByCell = new Map<string, Set<string>>();
    for (const cell of cells.cells) {
      const cellAttributes = await this.cellRepository.getAttributes(cell.id);
      const requiredAttrs = requiredAttributesByCell.get(cell.id) ?? new Set();
      for (const ca of cellAttributes) {
        if (ca.attribute.isRequired) {
          requiredAttrs.add(ca.attribute.slug);
        }
      }
      if (requiredAttrs.size > 0) {
        requiredAttributesByCell.set(cell.id, requiredAttrs);
      }
    }

    this.logger.debug(
      `Validation context built: ${cellSkuMap.size} cells by SKU, ` +
      `${attributeMap.size} attributes, ${attributeOptionMap.size} options`,
    );

    return {
      cellSkuMap,
      cellSlugMap,
      attributeMap,
      attributeOptionMap,
      requiredAttributesByCell,
    };
  }

  /**
   * Validate a single CSV row
   */
  async validateRow(
    rowNumber: number,
    row: CsvRow,
    context: ValidationContext,
    _validateOnly = false,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Validate required columns for new template format
    const requiredColumns = ['product_name'];
    for (const col of requiredColumns) {
      if (!row[col]) {
        errors.push({
          rowNumber,
          field: col,
          message: `Missing required field: ${col}`,
          severity: 'error',
        });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const productName = row.product_name!;

    // Validate cell_sku if provided
    let cellId: string | undefined;
    if (row.cell_sku) {
      cellId = context.cellSkuMap.get(row.cell_sku) ?? context.cellSlugMap.get(row.cell_sku);
      if (!cellId) {
        errors.push({
          rowNumber,
          field: 'cell_sku',
          message: `Cell not found: ${row.cell_sku}`,
          severity: 'error',
        });
      } else {
        // Check required attributes for cell
        const requiredAttrs = context.requiredAttributesByCell.get(cellId);
        if (requiredAttrs && requiredAttrs.size > 0) {
          for (const requiredAttr of requiredAttrs) {
            const found = Object.entries(row).some(([key, value]) =>
              key.startsWith('at_head') && value === requiredAttr,
            );
            if (!found) {
              errors.push({
                rowNumber,
                field: requiredAttr,
                message: `Missing required attribute for cell: ${requiredAttr}`,
                severity: 'error',
              });
            }
          }
        }
      }
    }

    // Validate at_head columns reference valid attributes
    const AT_HEAD_PATTERN = /^at_head(\d+)$/;
    for (const [key, value] of Object.entries(row)) {
      if (!AT_HEAD_PATTERN.test(key) || !value) continue;

      const attributeId = context.attributeMap.get(value);
      if (!attributeId) {
        errors.push({
          rowNumber,
          field: key,
          message: `Unknown attribute slug "${value}" in ${key}. Attribute must exist before importing.`,
          severity: 'error',
        });
      }
    }

    // Validate product name is not empty
    if (productName.trim().length === 0) {
      errors.push({
        rowNumber,
        field: 'product_name',
        message: 'Product name cannot be empty',
        severity: 'error',
      });
    }

    return {
      isValid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate multiple rows efficiently
   */
  async validateRows(
    rows: Array<{ rowNumber: number; data: CsvRow }>,
    context: ValidationContext,
    validateOnly = false,
  ): Promise<{ validationResults: ValidationResult[]; totalErrors: number; totalWarnings: number }> {
    const validationResults: ValidationResult[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const { rowNumber, data } of rows) {
      const result = await this.validateRow(rowNumber, data, context, validateOnly);
      validationResults.push(result);

      for (const error of result.errors) {
        if (error.severity === 'error') {
          totalErrors++;
        } else {
          totalWarnings++;
        }
      }
    }

    return {
      validationResults,
      totalErrors,
      totalWarnings,
    };
  }

  /**
   * Validate file format and headers
   */
  validateFileFormat(headers: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const requiredHeaders = ['product_name'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
