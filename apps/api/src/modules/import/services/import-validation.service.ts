import { Injectable, Logger } from '@nestjs/common';
import { CategoryRepository } from '@modules/catalog/repositories/category.repository';
import { ProductVariantRepository } from '@modules/catalog/repositories/product-variant.repository';
import { AttributeDefinitionRepository } from '@modules/catalog-attributes/repositories/attribute-definition.repository';
import { CategoryAttributeRepository } from '@modules/catalog-attributes/repositories/category-attribute.repository';
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
  categoryMap: Map<string, string>; // categoryPath -> categoryId
  attributeMap: Map<string, string>; // attributeSlug -> attributeId
  attributeOptionMap: Map<string, string>; // attributeSlug:optionValue -> optionId
  requiredAttributesByCategory: Map<string, Set<string>>; // categoryId -> Set<attributeSlug>
  skuSet: Set<string>; // Set of existing SKUs for uniqueness check
}

@Injectable()
export class ImportValidationService {
  private readonly logger = new Logger(ImportValidationService.name);

  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly attributeDefinitionRepository: AttributeDefinitionRepository,
    private readonly categoryAttributeRepository: CategoryAttributeRepository,
    private readonly attributeOptionRepository: AttributeOptionRepository,
  ) {}

  /**
   * Build validation context with preloaded maps for performance
   * This avoids 500k DB lookups during large imports
   */
  async buildValidationContext(): Promise<ValidationContext> {
    this.logger.debug('Building validation context...');

    // Load all categories
    const categories = await this.categoryRepository.findAll();
    const categoryMap = new Map<string, string>();
    for (const category of categories) {
      if (category.path) {
        categoryMap.set(category.path, category.id);
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

    // Load required attributes by category
    const categoryAttributes = await this.categoryAttributeRepository.findAll();
    const requiredAttributesByCategory = new Map<string, Set<string>>();
    for (const ca of categoryAttributes) {
      const attr = await this.attributeDefinitionRepository.findById(ca.attributeId);
      if (attr && attr.isRequired) {
        const requiredAttrs = requiredAttributesByCategory.get(ca.categoryId) ?? new Set();
        requiredAttrs.add(attr.slug);
        requiredAttributesByCategory.set(ca.categoryId, requiredAttrs);
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
      `Validation context built: ${categoryMap.size} categories, ` +
      `${attributeMap.size} attributes, ${attributeOptionMap.size} options, ` +
      `${skuSet.size} existing SKUs`,
    );

    return {
      categoryMap,
      attributeMap,
      attributeOptionMap,
      requiredAttributesByCategory,
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
    _validateOnly = false,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Validate required columns
    const requiredColumns = ['productName', 'sku', 'category', 'price', 'stock'];
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
    const categoryPath = row.category!;
    const price = row.price!;
    const stock = row.stock!;

    // Validate category exists
    const categoryId = context.categoryMap.get(categoryPath);
    if (!categoryId) {
      errors.push({
        rowNumber,
        sku,
        field: 'category',
        message: `Category not found: ${categoryPath}`,
        severity: 'error',
      });
    } else {
      // Check required attributes for category
      const requiredAttrs = context.requiredAttributesByCategory.get(categoryId);
      if (requiredAttrs && requiredAttrs.size > 0) {
        for (const requiredAttr of requiredAttrs) {
          if (!row[requiredAttr]) {
            errors.push({
              rowNumber,
              sku,
              field: requiredAttr,
              message: `Missing required attribute for category: ${requiredAttr}`,
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
      if (['productName', 'sku', 'category', 'price', 'stock'].includes(key)) {
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

      // Validate ENUM attributes
      if (attribute.dataType === AttributeDataType.ENUM && value) {
        const optionKey = `${attribute.slug}:${value}`;
        if (!context.attributeOptionMap.has(optionKey)) {
          errors.push({
            rowNumber,
            sku,
            field: key,
            message: `Invalid value for ${key}. Valid options are not preloaded or value is invalid: ${value}`,
            severity: 'error',
          });
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
   * Validate file format and headers
   */
  validateFileFormat(headers: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const requiredHeaders = ['productName', 'sku', 'category', 'price', 'stock'];
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
