import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomBytes } from 'crypto';

config({ path: resolve(__dirname, '../../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function generateMissingCategorySkus() {
  console.log('Starting SKU generation for categories without SKUs...');

  // Find all categories without SKUs
  const categoriesWithoutSku = await prisma.category.findMany({
    where: {
      sku: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  console.log(`Found ${categoriesWithoutSku.length} categories without SKUs`);

  if (categoriesWithoutSku.length === 0) {
    console.log('All categories already have SKUs!');
    return;
  }

  // Generate SKUs for each category
  let successCount = 0;
  let failureCount = 0;

  for (const category of categoriesWithoutSku) {
    try {
      const sku = generateSku();

      // Check if SKU already exists
      const existing = await prisma.category.findUnique({
        where: { sku },
      });

      if (existing) {
        console.warn(`SKU ${sku} already exists, skipping category ${category.name}`);
        failureCount++;
        continue;
      }

      // Update category with SKU
      await prisma.category.update({
        where: { id: category.id },
        data: { sku },
      });

      console.log(`Generated SKU ${sku} for category: ${category.name} (${category.slug})`);
      successCount++;
    } catch (error) {
      console.error(`Failed to generate SKU for category ${category.name}:`, error);
      failureCount++;
    }
  }

  console.log(`\nSKU generation complete:`);
  console.log(`- Success: ${successCount}`);
  console.log(`- Failed: ${failureCount}`);
}

function generateSku(): string {
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `CG-${randomPart}`;
}

generateMissingCategorySkus()
  .then(() => {
    console.log('\nDone!');
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error('Error:', error);
    return prisma.$disconnect().then(() => pool.end()).then(() => process.exit(1));
  });
