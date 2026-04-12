import { NotFoundException, BadRequestException, ConflictException, PayloadTooLargeException } from '@nestjs/common';

export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  abstract toHttpException(): Error;
}

export abstract class NotFoundError extends DomainError {
  constructor(entity: string, identifier: string) {
    super(`${entity} not found: ${identifier}`, `${entity.toUpperCase()}_NOT_FOUND`);
  }

  toHttpException(): NotFoundException {
    return new NotFoundException(this.message);
  }
}

export class AlreadyExistsError extends DomainError {
  constructor(entity: string, field: string, value: string) {
    super(
      `${entity} with this ${field} already exists: ${value}`,
      `${entity.toUpperCase()}_ALREADY_EXISTS`,
    );
  }

  toHttpException(): ConflictException {
    return new ConflictException(this.message);
  }
}

export abstract class InvalidOperationError extends DomainError {
  constructor(message: string, code: string) {
    super(message, code);
  }

  toHttpException(): BadRequestException {
    return new BadRequestException(this.message);
  }
}

export class PayloadTooLargeError extends DomainError {
  constructor(message: string, code: string) {
    super(message, code);
  }

  toHttpException(): PayloadTooLargeException {
    return new PayloadTooLargeException({
      message: this.message,
      code: this.code,
    });
  }
}
