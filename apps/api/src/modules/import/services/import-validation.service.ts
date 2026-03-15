import { Injectable, Logger } from '@nestjs/common';
import { CellRepository } from '@modules/cell/repositories/cell.repository';
import { ProductVariantRepository } from '@modules/catalog/repositories/product-variant.repository';
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
  cellMap: Map<string, string>; // cellPath -> cellId
  attributeMap: Map<string, string>; // attributeSlug -> attributeId
  attributeOptionMap: Map<string, string>; // attributeSlug:optionValue -> optionId
  requiredAttributesByCell: Map<string, Set<string>>; // cellId -> Set<attributeSlug>
  skuSet: Set<string>; // Set of existing SKUs for uniqueness check
}

@Injectable()
export class ImportValidationService {
  private readonly logger = new Logger(ImportValidationService.name);

  constructor(
    private readonly cellRepository: CellRepository,
    private readonly productVariantRepository: ProductVariantRepository,
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
    const cellMap = new Map<string, string>();
    for (const cell of cells.cells) {
      if (cell.slug) {
        cellMap.set(cell.slug, cell.id);
      }
    }

    // Load all attributes
    const attributes = await this.attributeDefinitionRepository.findAll();
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

    // Load existing SKUs for uniqueness check
    const existingVariants = await this.productVariantRepository.findAll();
    const skuSet = new Set<string>();
    for (const variant of existingVariants) {
      if (variant.sku) {
        skuSet.add(variant.sku.toLowerCase());
      }
    }

    this.logger.debug(
      `Validation context built: ${cellMap.size} cells, ` +
      `${attributeMap.size} attributes, ${attributeOptionMap.size} options, ` +
      `${skuSet.size} existing SKUs`,
    );

    return {
      cellMap,
      attributeMap,
      attributeOptionMap,
      requiredAttributesByCell,
      skuSet,
    };
  }

  /**
   * Validate a single CSV row
   */
  async validateRow(
    rowNumber: number,
    row: CsvRow,
    context: ValidationContext,
    validateOnly = false,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Validate required columns
    const requiredColumns = ['productName', 'sku', 'cell', 'price', 'stock'];
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

    // Extract fields with type safety
    const productName = row.productName!;
    const sku = row.sku!;
    const cellPath = row.cell!;
    const price = row.price!;
    const stock = row.stock!;

    // Validate cell exists
    const cellId = context.cellMap.get(cellPath);
    if (!cellId) {
      errors.push({
        rowNumber,
        sku,
        field: 'cell',
        message: `Cell not found: ${cellPath}`,
        severity: 'error',
      });
    } else {
      // Check required attributes for cell
      const requiredAttrs = context.requiredAttributesByCell.get(cellId);
      if (requiredAttrs && requiredAttrs.size > 0) {
        for (const requiredAttr of requiredAttrs) {
          if (!row[requiredAttr]) {
            errors.push({
              rowNumber,
              sku,
              field: requiredAttr,
              message: `Missing required attribute for cell: ${requiredAttr}`,
              severity: 'error',
            });
          }
        }
      }
    }

    // Validate SKU uniqueness
    if (context.skuSet.has(sku.toLowerCase())) {
      errors.push({
        rowNumber,
        sku,
        field: 'sku',
        message: `SKU already exists: ${sku}`,
        severity: 'error',
      });
    } else {
      // Add to set to catch duplicates within same import
      context.skuSet.add(sku.toLowerCase());
    }

    // Validate price is numeric and positive
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      errors.push({
        rowNumber,
        sku,
        field: 'price',
        message: `Price must be a valid number: ${price}`,
        severity: 'error',
      });
    } else if (priceNum < 0) {
      errors.push({
        rowNumber,
        sku,
        field: 'price',
        message: `Price must be positive: ${price}`,
        severity: 'error',
      });
    }

    // Validate stock is numeric and non-negative
    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum)) {
      errors.push({
        rowNumber,
        sku,
        field: 'stock',
        message: `Stock must be a valid number: ${stock}`,
        severity: 'error',
      });
    } else if (stockNum < 0) {
      errors.push({
        rowNumber,
        sku,
        field: 'stock',
        message: `Stock cannot be negative: ${stock}`,
        severity: 'error',
      });
    }

    // Validate attribute values
    for (const [key, value] of Object.entries(row)) {
      // Skip standard columns
      if (['productName', 'sku', 'cell', 'price', 'stock'].includes(key)) {
        continue;
      }

      // Check if this is a valid attribute
      const attributeId = context.attributeMap.get(key);
      if (!attributeId) {
        errors.push({
          rowNumber,
          sku,
          field: key,
          message: `Unknown attribute: ${key}`,
          severity: 'warning',
        });
        continue;
      }

      // Get attribute definition to validate type
      const attribute = await this.attributeDefinitionRepository.findById(attributeId);
      if (!attribute) continue;

      // Validate numeric attributes
      if (attribute.dataType === AttributeDataType.NUMBER && value) {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push({
            rowNumber,
            sku,
            field: key,
            message: `Attribute ${key} must be a number: ${value}`,
            severity: 'error',
          });
        }
      }

      // Validate ENUM attributes — auto-create missing options during real import
      if (attribute.dataType === AttributeDataType.ENUM && value) {
        const slug = this.toSlug(value);
        const optionKey = `${attribute.slug}:${slug}`;
        if (!context.attributeOptionMap.has(optionKey)) {
          if (validateOnly) {
            errors.push({
              rowNumber,
              sku,
              field: key,
              message: `New option "${value}" will be created for ${key} on import`,
              severity: 'warning',
            });
          } else {
            try {
              const label = this.toLabel(value);
              const created = await this.attributeOptionRepository.upsertByValue({
                attributeId: attribute.id,
                label,
                value: slug,
              });
              context.attributeOptionMap.set(optionKey, created.id);
              this.logger.log(
                `Auto-created attribute option "${label}" (${slug}) for ${attribute.slug}`,
              );
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              errors.push({
                rowNumber,
                sku,
                field: key,
                message: `Failed to auto-create option for ${key}: ${msg}`,
                severity: 'error',
              });
            }
          }
        }
      }
    }

    // Validate product name is not empty
    if (productName.trim().length === 0) {
      errors.push({
        rowNumber,
        sku,
        field: 'productName',
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
   * Convert a raw CSV value to a URL-safe slug.
   * "Stainless Steel" → "stainless-steel", "Grade 10.9" → "grade-10-9"
   */
  private toSlug(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[.]+/g, '-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Convert a raw CSV value to a human-readable label.
   * "stainless-steel" → "Stainless Steel", "grade-10-9" → "Grade 10 9"
   */
  private toLabel(raw: string): string {
    return raw
      .trim()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Validate file format and headers
   */
  validateFileFormat(headers: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const requiredHeaders = ['productName', 'sku', 'cell', 'price', 'stock'];
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
