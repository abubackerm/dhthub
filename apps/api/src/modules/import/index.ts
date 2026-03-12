// Import Module - Public API
//
// This module handles bulk product imports with the following features:
// - CSV file upload and validation
// - Batch processing (500 rows per transaction)
// - Progress tracking with metrics (duration, rowsPerSecond)
// - Error recording and reporting
// - Resume support via lastProcessedRow
// - Job locking to prevent duplicate processing
// - Rate limiting (max 2 concurrent imports)

// Module
export { ImportModule } from './import.module';

// Services
export * from './services';

// Repositories
export { ImportJobRepository } from './repositories/import-job.repository';
export { ImportErrorRepository } from './repositories/import-error.repository';

// Controllers
export * from './controllers';

// DTOs
export { CreateImportJobDto } from './dto/create-import-job.dto';
export * from './dto/views';

// Entities
export * from './entities';

// Events
export * from './events';

// Domain Errors
export * from './domain/errors';
