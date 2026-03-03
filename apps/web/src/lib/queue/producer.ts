import type { JobsOptions } from 'bullmq';
import { getQueue } from './queues';
import type { JobName, JobTypeMap } from './types';

export interface AddJobOptions extends JobsOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
}

export async function addJob<K extends JobName>(
  queueName: K,
  data: JobTypeMap[K],
  options?: AddJobOptions
) {
  const queue = getQueue(queueName);
  const job = await queue.add(queueName, data, options);
  return job;
}

export async function addBulkJobs<K extends JobName>(
  queueName: K,
  jobs: Array<{ data: JobTypeMap[K]; options?: AddJobOptions }>
) {
  const queue = getQueue(queueName);
  const bulkJobs = jobs.map((job) => ({
    name: queueName,
    data: job.data,
    opts: job.options,
  }));
  return queue.addBulk(bulkJobs);
}

export const jobHelpers = {
  email: {
    send: (data: JobTypeMap['email'], options?: AddJobOptions) =>
      addJob('email', data, { ...options, attempts: 5 }),
  },

  import: {
    queue: (data: JobTypeMap['import'], options?: AddJobOptions) =>
      addJob('import', data, { ...options, attempts: 3 }),
  },

  export: {
    queue: (data: JobTypeMap['export'], options?: AddJobOptions) =>
      addJob('export', data, { ...options, attempts: 3 }),
  },

  notification: {
    send: (data: JobTypeMap['notification'], options?: AddJobOptions) =>
      addJob('notification', data, { ...options, attempts: 3 }),
  },

  imageProcessing: {
    process: (data: JobTypeMap['image-processing'], options?: AddJobOptions) =>
      addJob('image-processing', data, { ...options, attempts: 3 }),
  },
};

export { getQueue };
