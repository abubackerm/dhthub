import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6380', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const connectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
};

export const redisConnection = new IORedis(connectionOptions);

redisConnection.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

/**
 * Queue names used in the application
 */
export const QUEUES = {
  PRODUCT_IMPORT: 'product-import',
  CATALOG_IMPORT: 'catalog-import',
  ATTRIBUTE_IMPORT: 'attribute-import',
  CATEGORY_IMPORT: 'category-import',
  EMAIL: 'email',
  EXPORT: 'export',
  NOTIFICATION: 'notification',
  IMAGE_PROCESSING: 'image-processing',
} as const;

/**
 * Default queue options
 */
export const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      count: 1000,
      age: 3600, // 1 hour
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
};

/**
 * Default worker options
 */
export const defaultWorkerOptions: WorkerOptions = {
  connection: redisConnection,
  concurrency: 1,
  limiter: {
    max: 2, // Max 2 concurrent imports to prevent overload
    duration: 1000,
  },
};

/**
 * Create or get a queue by name
 */
export function createQueue(name: string, options: QueueOptions = {}): Queue {
  return new Queue(name, {
    ...defaultQueueOptions,
    ...options,
  });
}

/**
 * Create or get a worker by name
 */
export function createWorker(
  name: string,
  processor: (job: any) => Promise<void>,
  options: WorkerOptions = {},
): Worker {
  return new Worker(
    name,
    processor,
    {
      ...defaultWorkerOptions,
      ...options,
    },
  );
}

/**
 * Get the product import queue
 */
export const productImportQueue = createQueue(QUEUES.PRODUCT_IMPORT);

export default {
  QUEUES,
  createQueue,
  createWorker,
  productImportQueue,
  redisConnection,
};
