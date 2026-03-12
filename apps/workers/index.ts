// Workers Module - BullMQ Worker Processes
//
// This module handles background job processing using BullMQ and Redis.
// Workers run as separate processes to handle CPU-intensive tasks like:
// - Bulk product imports with batch processing
// - Email sending
// - Data exports
// - Image processing
//
// Queue Configuration:
// - Rate limiter: max 2 concurrent imports to prevent overload
// - Connection: Redis with ioredis
// - Job removal: Completed jobs kept for 1 hour, failed for 7 days

// Queue Configuration
export * from './queue.config';

// Import Worker
export { ImportWorker } from './import.worker';
