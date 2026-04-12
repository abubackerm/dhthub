import { NotFoundError, AlreadyExistsError, InvalidOperationError, PayloadTooLargeError } from './base.domain-error';

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

export class CategoryHasChildrenError extends InvalidOperationError {
  constructor(categoryName: string, childCount: number) {
    super(
      `Cannot delete category "${categoryName}" because it has ${childCount} subcategories. Delete or move subcategories first.`,
      'CATEGORY_HAS_CHILDREN',
    );
  }
}

export class CategoryTooManyLeafCategoriesError extends PayloadTooLargeError {
  constructor(leafCount: number, maxAllowed: number, categoryName: string) {
    super(
      `Category "${categoryName}" has ${leafCount} sub-categories, exceeding the maximum of ${maxAllowed} for consolidated view. Navigate to a specific sub-category instead.`,
      'CATEGORY_TOO_MANY_LEAVES',
    );
  }
}
