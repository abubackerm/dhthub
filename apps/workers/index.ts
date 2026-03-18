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

// Import Workers
export { ImportWorker } from './import.worker';
export { CatalogImportWorker } from './catalog-import.worker';
export { AttributeImportWorker } from './attribute-import.worker';

// Start all workers when running this file directly
if (require.main === module) {
  const workers: any[] = [];

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down workers...`);
    
    await Promise.all(
      workers.map(async (worker: any) => {
        try {
          await worker.stop();
        } catch (error) {
          console.error(`Error stopping worker:`, error);
        }
      }),
    );
    
    process.exit(0);
  };

  // Start workers
  try {
    const { CatalogImportWorker } = require('./catalog-import.worker');
    const { AttributeImportWorker } = require('./attribute-import.worker');
    
    const catalogWorker = new CatalogImportWorker();
    const attributeWorker = new AttributeImportWorker();
    
    workers.push(catalogWorker);
    workers.push(attributeWorker);
    
    console.log('All workers initialized');
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Start workers
    Promise.all([
      catalogWorker.start(),
      attributeWorker.start(),
    ]).then(() => {
      console.log('All workers started and ready');
    }).catch((error) => {
      console.error('Failed to start workers:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to initialize workers:', error);
    process.exit(1);
  }
}
