import { NotFoundError, InvalidOperationError } from '@shared/domain/errors/base.domain-error';

export class CartNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Cart', identifier);
  }
}

export class CartItemNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('CartItem', identifier);
  }
}

export class InvalidQuantityError extends InvalidOperationError {
  constructor(message?: string) {
    super(
      message ?? 'Invalid quantity. Quantity must be a positive integer.',
      'INVALID_QUANTITY',
    );
  }
}

export class CartAlreadySubmittedError extends InvalidOperationError {
  constructor(cartId: string) {
    super(
      `Cart has already been submitted for quote: ${cartId}`,
      'CART_ALREADY_SUBMITTED',
    );
  }
}
