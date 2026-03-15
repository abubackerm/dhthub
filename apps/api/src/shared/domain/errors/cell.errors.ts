import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class CellNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Cell', identifier);
  }
}

export class CellSlugAlreadyExistsError extends AlreadyExistsError {
  constructor(slug: string) {
    super('Cell', 'slug', slug);
  }
}

export class CellHasProductsError extends InvalidOperationError {
  constructor(cellName: string, productCount: number) {
    super(
      `Cannot delete cell "${cellName}" because it has ${productCount} product(s). Move or delete products first.`,
      'CELL_HAS_PRODUCTS',
    );
  }
}

export class InvalidCellCategoryError extends InvalidOperationError {
  constructor(categoryId: string) {
    super(
      `Cells can only be created under leaf categories (categories with no children). Category ${categoryId} has children.`,
      'INVALID_CELL_CATEGORY',
    );
  }
}
