import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class UserNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('User', identifier);
  }
}

export class EmailAlreadyExistsError extends AlreadyExistsError {
  constructor(email: string) {
    super('User', 'email', email);
  }
}

export class UserDeactivatedError extends InvalidOperationError {
  constructor(userId: string) {
    super(`User account is deactivated: ${userId}`, 'USER_DEACTIVATED');
  }
}

export class UserAlreadyDeactivatedError extends InvalidOperationError {
  constructor(userId: string) {
    super(`User is already deactivated: ${userId}`, 'USER_ALREADY_DEACTIVATED');
  }
}
