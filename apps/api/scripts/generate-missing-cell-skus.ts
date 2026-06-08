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

async function generateMissingCellSkus() {
  console.log('Starting SKU generation for cells without SKUs...');

  // Find all cells without SKUs
  const cellsWithoutSku = await prisma.cell.findMany({
    where: {
      sku: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  console.log(`Found ${cellsWithoutSku.length} cells without SKUs`);

  if (cellsWithoutSku.length === 0) {
    console.log('All cells already have SKUs!');
    return;
  }

  // Generate SKUs for each cell
  let successCount = 0;
  let failureCount = 0;

  for (const cell of cellsWithoutSku) {
    try {
      const sku = generateSku();

      // Check if SKU already exists
      const existing = await prisma.cell.findUnique({
        where: { sku },
      });

      if (existing) {
        console.warn(`SKU ${sku} already exists, skipping cell ${cell.name}`);
        failureCount++;
        continue;
      }

      // Update cell with SKU
      await prisma.cell.update({
        where: { id: cell.id },
        data: { sku },
      });

      console.log(`Generated SKU ${sku} for cell: ${cell.name} (${cell.slug})`);
      successCount++;
    } catch (error) {
      console.error(`Failed to generate SKU for cell ${cell.name}:`, error);
      failureCount++;
    }
  }

  console.log(`\nSKU generation complete:`);
  console.log(`- Success: ${successCount}`);
  console.log(`- Failed: ${failureCount}`);
}

function generateSku(): string {
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `C-${randomPart}`;
}

generateMissingCellSkus()
  .then(() => {
    console.log('\nDone!');
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error('Error:', error);
    return prisma.$disconnect().then(() => pool.end()).then(() => process.exit(1));
  });
