import { Queue } from 'bullmq';

// Use environment variables directly
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6380');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

async function checkQueue() {
  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  };

  const catalogQueue = new Queue('catalog-import', { connection });

  console.log('=== CATALOG-IMPORT QUEUE STATUS ===\n');

  const waiting = await catalogQueue.getWaiting();
  const active = await catalogQueue.getActive();
  const delayed = await catalogQueue.getDelayed();
  const failed = await catalogQueue.getFailed();
  const completed = await catalogQueue.getCompleted();

  console.log(`Waiting: ${waiting.length}`);
  console.log(`Active: ${active.length}`);
  console.log(`Delayed: ${delayed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Completed: ${completed.length}`);

  if (waiting.length > 0) {
    console.log('\n=== WAITING JOBS ===');
    for (const job of waiting) {
      console.log(`Job ID: ${job.id}`);
      console.log(`  Job Name: ${job.name}`);
      console.log(`  Data:`, JSON.stringify(job.data, null, 2));
      console.log(`  Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
      console.log(`  Created: ${new Date(job.timestamp).toISOString()}`);
    }
  }

  if (active.length > 0) {
    console.log('\n=== ACTIVE JOBS ===');
    for (const job of active) {
      console.log(`Job ID: ${job.id}`);
      console.log(`  Job Name: ${job.name}`);
      console.log(`  Data:`, JSON.stringify(job.data, null, 2));
    }
  }

  if (failed.length > 0) {
    console.log('\n=== FAILED JOBS ===');
    for (const job of failed) {
      console.log(`Job ID: ${job.id}`);
      console.log(`  Job Name: ${job.name}`);
      console.log(`  Failed Reason: ${job.failedReason}`);
      console.log(`  Stacktrace:`, job.stacktrace?.[0]);
    }
  }

  await catalogQueue.close();
  process.exit(0);
}

checkQueue().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
