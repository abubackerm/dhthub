import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('=== Checking Database State ===\n');

  // Check if SKU 91578A204 exists
  const variant = await prisma.productVariant.findFirst({
    where: { sku: '91578A204' },
    select: { id: true, sku: true, name: true, productId: true },
  });

  console.log('Product Variant for SKU 91578A204:');
  if (variant) {
    console.log(`  Found: ID=${variant.id}, SKU=${variant.sku}, Name=${variant.name}`);
  } else {
    console.log('  NOT FOUND - This is the problem!');
  }

  // Check variant images
  const allImages = await prisma.variantImage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, sku: true, variantId: true, position: true, storagePath: true, isPrimary: true },
  });

  console.log(`\nRecent variant images (total: ${await prisma.variantImage.count()}):`);
  allImages.forEach((img, idx) => {
    console.log(`  ${idx + 1}. SKU=${img.sku}, Position=${img.position}, Path=${img.storagePath}`);
  });

  // Check images for SKU 91578A204
  const skuImages = await prisma.variantImage.findMany({
    where: { sku: '91578A204' },
    orderBy: { position: 'asc' },
  });

  console.log(`\nImages for SKU 91578A204 (count: ${skuImages.length}):`);
  skuImages.forEach((img) => {
    console.log(`  - Position ${img.position}: ${img.storagePath} (ID: ${img.id}, Variant: ${img.variantId}, Primary: ${img.isPrimary})`);
  });

  // Check stuck job status
  const job = await prisma.importJob.findUnique({
    where: { id: '67e544ff-2cd5-427a-8474-eb154e41a90c' },
  });

  console.log(`\nJob ${job.id.substring(0, 8)}... status: ${job.status}, processedRows: ${job.processedRows}`);

  await prisma.$disconnect();
}

checkDatabase().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
