import { NotFoundError, InvalidOperationError } from '@shared/domain/errors/base.domain-error';

export class EnquiryNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Enquiry', identifier);
  }
}

export class EnquiryItemNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('EnquiryItem', identifier);
  }
}

export class EnquiryCannotBeModifiedError extends InvalidOperationError {
  constructor(enquiryId: string, reason: string = 'This enquiry cannot be modified in its current state') {
    super(
      `Cannot modify enquiry ${enquiryId}: ${reason}`,
      'ENQUIRY_CANNOT_BE_MODIFIED',
    );
  }
}

export class CartAlreadySubmittedError extends InvalidOperationError {
  constructor(cartId: string) {
    super(
      `Cart has already been submitted for enquiry: ${cartId}`,
      'CART_ALREADY_SUBMITTED',
    );
  }
}
