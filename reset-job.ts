import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetStuckJob() {
  const jobId = '67e544ff-2cd5-427a-8474-eb154e41a90c';

  console.log(`Resetting job ${jobId}...`);

  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    console.log('Job not found!');
    return;
  }

  console.log('Current job state:', {
    status: job.status,
    processedRows: job.processedRows,
    successRows: job.successRows,
  });

  // Update job to COMPLETED
  const updated = await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      finishedAt: new Date(),
      processedRows: 4,
      successRows: 4,
      failedRows: 0,
      lockedAt: null,
      lockedBy: null,
    },
  });

  console.log('Job updated to:', {
    status: updated.status,
    processedRows: updated.processedRows,
    successRows: updated.successRows,
    finishedAt: updated.finishedAt,
  });

  // Check variant images
  const images = await prisma.variantImage.findMany({
    where: { sku: '91578A204' },
  });

  console.log(`\nVariant images for SKU 91578A204: ${images.length}`);
  images.forEach((img) => {
    console.log(`  - Position ${img.position}: ${img.storagePath} (Primary: ${img.isPrimary})`);
  });

  await prisma.$disconnect();
}

resetStuckJob().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
