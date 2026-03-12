import { NotFoundError, InvalidOperationError } from '@shared/domain/errors/base.domain-error';

export class ImportJobNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('ImportJob', identifier);
  }
}

export class InvalidFileFormatError extends InvalidOperationError {
  constructor(fileName: string, expectedFormat: string) {
    super(
      `Invalid file format for ${fileName}. Expected: ${expectedFormat}`,
      'INVALID_FILE_FORMAT',
    );
  }
}

export class InvalidImportDataError extends InvalidOperationError {
  constructor(message: string) {
    super(message, 'INVALID_IMPORT_DATA');
  }
}

export class ImportValidationError extends InvalidOperationError {
  constructor(rowNumber: number, message: string) {
    super(`Validation error at row ${rowNumber}: ${message}`, 'IMPORT_VALIDATION_ERROR');
  }
}

export class ImportAlreadyProcessingError extends InvalidOperationError {
  constructor(jobId: string) {
    super(
      `Import job is already being processed: ${jobId}`,
      'IMPORT_ALREADY_PROCESSING',
    );
  }
}

export class ImportLockError extends InvalidOperationError {
  constructor(jobId: string) {
    super(`Failed to acquire lock for import job: ${jobId}`, 'IMPORT_LOCK_ERROR');
  }
}
