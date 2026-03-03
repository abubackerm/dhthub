import { Queue } from 'bullmq';
import { connectionOptions } from '../connection';
import type { JobName } from '../types';

export const QUEUE_NAMES = {
  EMAIL: 'email',
  IMPORT: 'import',
  EXPORT: 'export',
  NOTIFICATION: 'notification',
  IMAGE_PROCESSING: 'image-processing',
} as const;

type QueueMap = {
  [K in JobName]: Queue;
};

const queues: Partial<QueueMap> = {};

export function getQueue(name: JobName): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: connectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 5000,
        },
      },
    });
  }
  return queues[name]!;
}

export function closeAllQueues(): Promise<void[]> {
  const closePromises = Object.values(queues)
    .filter((queue): queue is Queue => queue !== undefined)
    .map((queue) => queue.close());
  return Promise.all(closePromises);
}

export { queues };
