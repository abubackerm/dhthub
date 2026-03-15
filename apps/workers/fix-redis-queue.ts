import { Queue } from 'bullmq';
import * as dotenv from 'dotenv';

// Load environment variables from root .env file
dotenv.config({ path: require('path').join(__dirname, '../..', '.env') });

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6380');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

console.log(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

async function fixCatalogImportQueue() {
  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  };

  const catalogImportQueue = new Queue('catalog-import', { connection });

  console.log('Checking catalog-import queue for jobs with empty fileUrl...');

  const waiting = await catalogImportQueue.getWaiting();
  const active = await catalogImportQueue.getActive();
  const delayed = await catalogImportQueue.getDelayed();
  const failed = await catalogImportQueue.getFailed();
  const completed = await catalogImportQueue.getCompleted();

  const allJobs = [...waiting, ...active, ...delayed, ...failed, ...completed];

  console.log(`\nTotal jobs found: ${allJobs.length}`);
  console.log(`  - Waiting: ${waiting.length}`);
  console.log(`  - Active: ${active.length}`);
  console.log(`  - Delayed: ${delayed.length}`);
  console.log(`  - Failed: ${failed.length}`);
  console.log(`  - Completed: ${completed.length}`);

  let jobsToRemove: string[] = [];

  for (const job of allJobs) {
    if (!job.data.fileUrl || job.data.fileUrl === '') {
      console.log(`\n❌ Found job with empty fileUrl:`);
      console.log(`   Job ID: ${job.id}`);
      console.log(`   Job Name: ${job.name}`);
      console.log(`   Data:`, JSON.stringify(job.data, null, 2));
      jobsToRemove.push(job.id as string);
    }
  }

  if (jobsToRemove.length === 0) {
    console.log('\n✅ No jobs with empty fileUrl found. Queue is clean!');
  } else {
    console.log(`\n⚠️  Found ${jobsToRemove.length} job(s) with empty fileUrl. Removing them...`);

    for (const jobId of jobsToRemove) {
      try {
        const job = await catalogImportQueue.getJob(jobId);
        if (job) {
          await job.remove();
          console.log(`   ✅ Removed job ${jobId}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to remove job ${jobId}:`, error);
      }
    }

    console.log('\n✅ Cleaned up all jobs with empty fileUrl');
  }

  await catalogImportQueue.close();
  process.exit(0);
}

fixCatalogImportQueue().catch((error) => {
  console.error('Error fixing Redis queue:', error);
  process.exit(1);
});
