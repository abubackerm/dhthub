import { Queue, Worker } from 'bullmq';
import * as dotenv from 'dotenv';

// Load environment variables from root .env file
dotenv.config({ path: require('path').join(__dirname, '../..', '.env') });

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6380');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
};

async function inspectQueue() {
  const catalogImportQueue = new Queue('catalog-import', { connection });

  console.log('Inspecting catalog-import queue...\n');

  const waiting = await catalogImportQueue.getWaiting();
  const active = await catalogImportQueue.getActive();
  const delayed = await catalogImportQueue.getDelayed();
  const failed = await catalogImportQueue.getFailed();
  const completed = await catalogImportQueue.getCompleted();

  console.log('=== WAITING JOBS ===');
  for (const job of waiting) {
    console.log(`Job ${job.id}:`, JSON.stringify(job.data, null, 2));
  }

  console.log('\n=== ACTIVE JOBS ===');
  for (const job of active) {
    console.log(`Job ${job.id}:`, JSON.stringify(job.data, null, 2));
  }

  console.log('\n=== FAILED JOBS ===');
  for (const job of failed) {
    console.log(`Job ${job.id}:`, JSON.stringify(job.data, null, 2));
    console.log(`  Failed with:`, job.failedReason);
    console.log(`  Stacktrace:`, job.stacktrace?.[0]);
  }

  console.log('\n=== DELAYED JOBS ===');
  for (const job of delayed) {
    console.log(`Job ${job.id}:`, JSON.stringify(job.data, null, 2));
  }

  console.log('\n=== QUEUE STATS ===');
  console.log(`Waiting: ${waiting.length}`);
  console.log(`Active: ${active.length}`);
  console.log(`Delayed: ${delayed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Completed: ${completed.length}`);

  await catalogImportQueue.close();
  process.exit(0);
}

inspectQueue().catch((error) => {
  console.error('Error inspecting queue:', error);
  process.exit(1);
});
