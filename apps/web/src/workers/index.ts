import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../lib/queue/connection';
import type { JobTypeMap, JobName } from '../lib/queue/types';

type JobProcessor<K extends JobName> = (
  job: Job<JobTypeMap[K]>
) => Promise<unknown>;

const processors: { [K in JobName]: JobProcessor<K> } = {
  email: async (job) => {
    console.log(`[Email] Processing job ${job.id}`, job.data);
    const { to, subject, template, data: _data } = job.data;
    
    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    console.log(`[Email] Sent to ${to} with subject "${subject}" using template "${template}"`);
    return { success: true, sentAt: new Date().toISOString() };
  },

  import: async (job) => {
    console.log(`[Import] Processing job ${job.id}`, job.data);
    const { fileId: _fileId, fileName, fileType, userId } = job.data;
    
    // Simulate import process with progress
    for (let i = 0; i <= 100; i += 20) {
      await job.updateProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    console.log(`[Import] Completed import of ${fileName} (${fileType}) for user ${userId}`);
    return { success: true, recordsImported: 100 };
  },

  export: async (job) => {
    console.log(`[Export] Processing job ${job.id}`, job.data);
    const { format, filters: _filters, userId } = job.data;
    
    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    console.log(`[Export] Generated ${format} export for user ${userId}`);
    return { success: true, downloadUrl: `/downloads/export-${job.id}.${format}` };
  },

  notification: async (job) => {
    console.log(`[Notification] Processing job ${job.id}`, job.data);
    const { userId, type, title, message: _message } = job.data;
    
    // Simulate notification sending
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    console.log(`[Notification] Sent ${type} notification to user ${userId}: ${title}`);
    return { success: true, deliveredAt: new Date().toISOString() };
  },

  'image-processing': async (job) => {
    console.log(`[ImageProcessing] Processing job ${job.id}`, job.data);
    const { imageId, operations } = job.data;
    
    // Simulate image processing with progress
    for (let i = 0; i < operations.length; i++) {
      await job.updateProgress((i + 1) / operations.length * 100);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    
    console.log(`[ImageProcessing] Completed ${operations.length} operations on image ${imageId}`);
    return { success: true, processedAt: new Date().toISOString() };
  },
};

const workers: Worker[] = [];

export async function startWorkers() {
  const queueNames = Object.keys(processors) as JobName[];
  
  for (const queueName of queueNames) {
    const worker = new Worker<JobTypeMap[typeof queueName]>(
      queueName,
      async (job) => {
        const processor = processors[queueName] as JobProcessor<typeof queueName>;
        return processor(job);
      },
      {
        connection: connectionOptions,
        concurrency: 5,
      }
    );

    worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} in queue "${queueName}" completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} in queue "${queueName}" failed:`, err.message);
    });

    worker.on('error', (err) => {
      console.error(`[Worker] Error in queue "${queueName}":`, err.message);
    });

    workers.push(worker);
    console.log(`[Worker] Started worker for queue "${queueName}"`);
  }
}

export async function stopWorkers() {
  console.log('[Worker] Stopping all workers...');
  await Promise.all(workers.map((worker) => worker.close()));
  console.log('[Worker] All workers stopped');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM');
  await stopWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] Received SIGINT');
  await stopWorkers();
  process.exit(0);
});

// Start workers if this file is run directly
if (require.main === module) {
  startWorkers()
    .then(() => {
      console.log('[Worker] All workers started successfully');
    })
    .catch((err) => {
      console.error('[Worker] Failed to start workers:', err);
      process.exit(1);
    });
}
