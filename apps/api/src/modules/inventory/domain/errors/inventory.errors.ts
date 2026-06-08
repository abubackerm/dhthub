import { NotFoundError, InvalidOperationError, AlreadyExistsError } from '@shared/domain/errors/base.domain-error';

export class OutOfStockError extends InvalidOperationError {
  constructor(variantId: string, available: number, requested: number) {
    super(
      `Insufficient stock for variant ${variantId}. Available: ${available}, Requested: ${requested}`,
      'OUT_OF_STOCK',
    );
  }
}

export class WarehouseNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Warehouse', identifier);
  }
}

export class InventoryLevelNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('InventoryLevel', identifier);
  }
}

export class ReservationNotFoundError extends NotFoundError {
  constructor(referenceId: string, referenceType?: string) {
    const suffix = referenceType ? ` (${referenceType})` : '';
    super('Reservation', `${referenceId}${suffix}`);
  }
}

export class InvalidReservationStatusError extends InvalidOperationError {
  constructor(referenceId: string, currentStatus: string, action: string) {
    super(
      `Cannot ${action} reservation ${referenceId}. Current status: ${currentStatus}`,
      'INVALID_RESERVATION_STATUS',
    );
  }
}

export class WarehouseAlreadyExistsError extends AlreadyExistsError {
  constructor(code: string) {
    super('Warehouse', 'code', code);
  }
}
