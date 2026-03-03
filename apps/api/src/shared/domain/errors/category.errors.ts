import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class CategoryNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Category', identifier);
  }
}

export class CategorySlugAlreadyExistsError extends AlreadyExistsError {
  constructor(slug: string) {
    super('Category', 'slug', slug);
  }
}

export class CategoryCircularReferenceError extends InvalidOperationError {
  constructor(categoryId: string, parentId: string) {
    super(
      `Cannot set parent: circular reference detected between ${categoryId} and ${parentId}`,
      'CATEGORY_CIRCULAR_REFERENCE',
    );
  }
}
