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

async function generateMissingProductSkus() {
  console.log('Starting SKU generation for products without SKUs...');

  // Find all products without SKUs
  const productsWithoutSku = await prisma.product.findMany({
    where: {
      sku: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  console.log(`Found ${productsWithoutSku.length} products without SKUs`);

  if (productsWithoutSku.length === 0) {
    console.log('All products already have SKUs!');
    return;
  }

  // Generate SKUs for each product
  let successCount = 0;
  let failureCount = 0;

  for (const product of productsWithoutSku) {
    try {
      const sku = generateSku();

      // Check if SKU already exists
      const existing = await prisma.product.findUnique({
        where: { sku },
      });

      if (existing) {
        console.warn(`SKU ${sku} already exists, skipping product ${product.name}`);
        failureCount++;
        continue;
      }

      // Update product with SKU
      await prisma.product.update({
        where: { id: product.id },
        data: { sku },
      });

      console.log(`Generated SKU ${sku} for product: ${product.name} (${product.slug})`);
      successCount++;
    } catch (error) {
      console.error(`Failed to generate SKU for product ${product.name}:`, error);
      failureCount++;
    }
  }

  console.log(`\nSKU generation complete:`);
  console.log(`- Success: ${successCount}`);
  console.log(`- Failed: ${failureCount}`);
}

function generateSku(): string {
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `P-${randomPart}`;
}

generateMissingProductSkus()
  .then(() => {
    console.log('\nDone!');
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error('Error:', error);
    return prisma.$disconnect().then(() => pool.end()).then(() => process.exit(1));
  });
