import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class AttributeNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Attribute Definition', identifier);
  }
}

export class AttributeSlugAlreadyExistsError extends AlreadyExistsError {
  constructor(slug: string) {
    super('Attribute Definition', 'slug', slug);
  }
}

export class InvalidAttributeValueError extends InvalidOperationError {
  constructor(attributeName: string, message: string) {
    super(
      `Invalid value for attribute "${attributeName}": ${message}`,
      'INVALID_ATTRIBUTE_VALUE',
    );
  }
}

export class MissingRequiredAttributeError extends InvalidOperationError {
  constructor(attributeName: string, categoryName: string) {
    super(
      `Missing required attribute "${attributeName}" for category "${categoryName}"`,
      'MISSING_REQUIRED_ATTRIBUTE',
    );
  }
}

export class AttributeNotAssignedToCategoryError extends InvalidOperationError {
  constructor(attributeName: string, categoryName: string) {
    super(
      `Attribute "${attributeName}" is not assigned to category "${categoryName}"`,
      'ATTRIBUTE_NOT_ASSIGNED_TO_CATEGORY',
    );
  }
}

export class InvalidAttributeOptionError extends InvalidOperationError {
  constructor(attributeName: string, optionId: string) {
    super(
      `Invalid option for attribute "${attributeName}": optionId "${optionId}" does not belong to this attribute`,
      'INVALID_ATTRIBUTE_OPTION',
    );
  }
}

export class VariantNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Product Variant', identifier);
  }
}

export const CatalogAttributeErrors = {
  AttributeNotFoundError,
  AttributeSlugAlreadyExistsError,
  InvalidAttributeValueError,
  MissingRequiredAttributeError,
  AttributeNotAssignedToCategoryError,
  InvalidAttributeOptionError,
  VariantNotFoundError,
};
