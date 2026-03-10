import {
  NotFoundError,
  AlreadyExistsError,
  InvalidOperationError,
} from '@shared/domain/errors/base.domain-error';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class CurrencyNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Currency', identifier);
  }

  toHttpException(): NotFoundException {
    return new NotFoundException(this.message);
  }
}

export class VariantNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Variant', identifier);
  }

  toHttpException(): NotFoundException {
    return new NotFoundException(this.message);
  }
}

export class InvalidPriceTierOrderError extends InvalidOperationError {
  constructor() {
    super(
      'Price tiers must be sorted by minQty in ascending order',
      'INVALID_PRICE_TIER_ORDER',
    );
  }

  toHttpException(): BadRequestException {
    return new BadRequestException(this.message);
  }
}

export class PriceTierMustStartAtOneError extends InvalidOperationError {
  constructor() {
    super(
      'First price tier must start at minQty = 1',
      'PRICE_TIER_MUST_START_AT_ONE',
    );
  }

  toHttpException(): BadRequestException {
    return new BadRequestException(this.message);
  }
}

export class DuplicatePriceTierError extends AlreadyExistsError {
  constructor(minQty: number) {
    super('PriceTier', 'minQty', minQty.toString());
  }

  toHttpException(): ConflictException {
    return new ConflictException(this.message);
  }
}

export class OverlappingPriceTiersError extends InvalidOperationError {
  constructor() {
    super(
      'Price tiers have overlapping quantity ranges. Ensure maxQty < next tier minQty.',
      'OVERLAPPING_PRICE_TIERS',
    );
  }

  toHttpException(): BadRequestException {
    return new BadRequestException(this.message);
  }
}

export class InvalidUnitPriceError extends InvalidOperationError {
  constructor() {
    super(
      'Unit price must be a positive value',
      'INVALID_UNIT_PRICE',
    );
  }

  toHttpException(): BadRequestException {
    return new BadRequestException(this.message);
  }
}

export class PricingNotFoundError extends NotFoundError {
  constructor(variantId: string, currencyCode: string) {
    super('Pricing', `${variantId}/${currencyCode}`);
  }

  toHttpException(): NotFoundException {
    return new NotFoundException(this.message);
  }
}
