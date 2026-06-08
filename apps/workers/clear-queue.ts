import { Queue } from 'bullmq';
import * as dotenv from 'dotenv';

dotenv.config({ path: require('path').join(__dirname, '../..', '.env') });

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6380');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

async function clearQueue() {
  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  };

  const catalogImportQueue = new Queue('catalog-import', { connection });

  console.log('Clearing all jobs from catalog-import queue...');

  const waiting = await catalogImportQueue.getWaiting();
  const active = await catalogImportQueue.getActive();
  const delayed = await catalogImportQueue.getDelayed();
  const failed = await catalogImportQueue.getFailed();
  const completed = await catalogImportQueue.getCompleted();

  const allJobs = [...waiting, ...active, ...delayed, ...failed, ...completed];
  console.log(`Found ${allJobs.length} jobs to remove...`);

  let removedCount = 0;
  for (const job of allJobs) {
    try {
      await job.remove();
      removedCount++;
      if (removedCount % 10 === 0) {
        console.log(`  Removed ${removedCount}/${allJobs.length} jobs...`);
      }
    } catch (error) {
      console.error(`  Failed to remove job ${job.id}:`, error);
    }
  }

  console.log(`\n✅ Cleared ${removedCount} jobs from the queue`);

  await catalogImportQueue.close();
  process.exit(0);
}

clearQueue().catch((error) => {
  console.error('Error clearing queue:', error);
  process.exit(1);
});
