import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { CatalogAttributeErrors } from '@shared/domain/errors';
import { VariantAttributeValueRepository } from '../repositories';
import { AttributeDefinitionRepository } from '../repositories/attribute-definition.repository';
import { CategoryAttributeRepository } from '../repositories/category-attribute.repository';
import { AttributeOptionRepository } from '../repositories/attribute-option.repository';
import { ProductVariantRepository } from '@modules/catalog/repositories/product-variant.repository';
import { ProductRepository } from '@modules/catalog/repositories/product.repository';
import { VariantAttributeValueEntity } from '../entities';
import { AttributeDataType } from '../entities/attribute-definition.entity';
import { CacheService } from '@core/cache';
import { CellRepository } from '@modules/cell';

export interface AttributeValueInput {
  attributeId: string;
  numberValue?: number | null;
  textValue?: string | null;
  optionId?: string | null;
  booleanValue?: boolean | null;
}

export interface VariantAttributeInput {
  variantId: string;
  attributes: AttributeValueInput[];
}

@Injectable()
export class VariantAttributeService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly variantAttributeRepo: VariantAttributeValueRepository,
    private readonly attributeRepo: AttributeDefinitionRepository,
    private readonly categoryAttributeRepo: CategoryAttributeRepository,
    private readonly attributeOptionRepo: AttributeOptionRepository,
    private readonly productVariantRepo: ProductVariantRepository,
    private readonly productRepo: ProductRepository,
    private readonly cellRepo: CellRepository,
    private readonly cacheService: CacheService,
  ) {
    super(eventEmitter);
  }

  private getCacheKey(variantId: string): string {
    return `variant-attributes:${variantId}`;
  }

  async assignAttributes(
    variantId: string,
    attributes: AttributeValueInput[],
  ): Promise<VariantAttributeValueEntity[]> {
    const variant = await this.productVariantRepo.findById(variantId);
    if (!variant) {
      throw new CatalogAttributeErrors.VariantNotFoundError(variantId);
    }

    const product = await this.productRepo.findById(variant.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.cellId) {
      throw new CatalogAttributeErrors.InvalidAttributeValueError('', 'Variant must belong to a cell');
    }

    const cell = await this.cellRepo.findById(product.cellId);
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    const categoryAttributes = await this.categoryAttributeRepo.findByCategoryId(cell.categoryId);

    const requiredAttributes = categoryAttributes
      .filter((ca) => ca.attribute.isRequired)
      .map((ca) => ca.attributeId);

    const providedAttributeIds = new Set(attributes.map((a) => a.attributeId));

    const optionIds = attributes
      .filter((a) => a.optionId)
      .map((a) => a.optionId!);

    const optionsMap = new Map<string, any>();
    if (optionIds.length > 0) {
      const options = await this.attributeOptionRepo.findManyByIds(optionIds);
      options.forEach((option) => optionsMap.set(option.id, option));
    }

    for (const attr of attributes) {
      const definition = await this.attributeRepo.findById(attr.attributeId);
      if (!definition) {
        throw new CatalogAttributeErrors.AttributeNotFoundError(attr.attributeId);
      }

      const belongsToCategory = categoryAttributes.some(
        (ca) => ca.attributeId === attr.attributeId,
      );
      if (!belongsToCategory) {
        throw new CatalogAttributeErrors.AttributeNotAssignedToCategoryError(definition.name, cell.name);
      }

      this.validateValueType(definition, attr);

      if (attr.optionId) {
        const option = optionsMap.get(attr.optionId);
        if (!option) {
          throw new CatalogAttributeErrors.InvalidAttributeOptionError(definition.name, attr.optionId);
        }
        if (option.attributeId !== attr.attributeId) {
          throw new CatalogAttributeErrors.InvalidAttributeOptionError(definition.name, attr.optionId);
        }
      }
    }

    for (const requiredAttrId of requiredAttributes) {
      if (!providedAttributeIds.has(requiredAttrId)) {
        const requiredAttrDef = await this.attributeRepo.findById(requiredAttrId);
        if (requiredAttrDef) {
          throw new CatalogAttributeErrors.MissingRequiredAttributeError(requiredAttrDef.name, cell.name);
        }
      }
    }

    await this.variantAttributeRepo.deleteByVariantId(variantId);

    const createdAttributes: VariantAttributeValueEntity[] = [];
    for (const attr of attributes) {
      const created = await this.variantAttributeRepo.create({
        variantId,
        attributeId: attr.attributeId,
        numberValue: attr.numberValue ?? null,
        textValue: attr.textValue ?? null,
        optionId: attr.optionId ?? null,
        booleanValue: attr.booleanValue ?? null,
      });
      createdAttributes.push(created);
    }

    this.emit('variant.attributes.assigned', {
      variantId,
      attributeCount: createdAttributes.length,
    });

    await this.cacheService.del(this.getCacheKey(variantId));

    return createdAttributes;
  }

  private validateValueType(
    definition: { name: string; dataType: AttributeDataType },
    attr: AttributeValueInput,
  ): void {
    const valueFields = [
      attr.numberValue !== undefined && attr.numberValue !== null,
      attr.textValue !== undefined && attr.textValue !== null,
      attr.optionId !== undefined && attr.optionId !== null,
      attr.booleanValue !== undefined && attr.booleanValue !== null,
    ].filter(Boolean).length;

    if (valueFields !== 1) {
      throw new CatalogAttributeErrors.InvalidAttributeValueError(
        definition.name,
        `Exactly one value field must be provided. Found ${valueFields} value fields.`,
      );
    }

    switch (definition.dataType) {
      case AttributeDataType.NUMBER:
        if (attr.numberValue === undefined || attr.numberValue === null) {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'numberValue is required for NUMBER type',
          );
        }
        if (attr.textValue !== undefined || attr.optionId !== undefined || attr.booleanValue !== undefined) {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'NUMBER type only accepts numberValue',
          );
        }
        break;
      case AttributeDataType.TEXT:
        if (!attr.textValue || attr.textValue.trim() === '') {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'textValue is required for TEXT type',
          );
        }
        if (attr.numberValue !== undefined || attr.optionId !== undefined || attr.booleanValue !== undefined) {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'TEXT type only accepts textValue',
          );
        }
        break;
      case AttributeDataType.ENUM:
        if (!attr.optionId) {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'optionId is required for ENUM type',
          );
        }
        if (attr.numberValue !== undefined || attr.textValue !== undefined || attr.booleanValue !== undefined) {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'ENUM type only accepts optionId',
          );
        }
        break;
      case AttributeDataType.BOOLEAN:
        if (attr.booleanValue === undefined || attr.booleanValue === null) {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'booleanValue is required for BOOLEAN type',
          );
        }
        if (attr.numberValue !== undefined || attr.textValue !== undefined || attr.optionId !== undefined) {
          throw new CatalogAttributeErrors.InvalidAttributeValueError(
            definition.name,
            'BOOLEAN type only accepts booleanValue',
          );
        }
        break;
    }
  }

  async getVariantAttributes(variantId: string): Promise<VariantAttributeValueEntity[]> {
    return this.cacheService.wrap(
      this.getCacheKey(variantId),
      async () => {
        return this.variantAttributeRepo.findByVariantIdWithAttribute(variantId);
      },
      600,
    );
  }

  async deleteAttributeValues(variantId: string): Promise<void> {
    await this.variantAttributeRepo.deleteByVariantId(variantId);

    await this.cacheService.del(this.getCacheKey(variantId));

    this.emit('variant.attributes.deleted', { variantId });
  }
}
