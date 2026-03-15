import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolve } from 'node:path';

// Load .env from project root
config({ path: resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

async function migrateCellData() {
  console.log('Starting cell data migration...');

  try {
    // Step 1: Find all leaf categories that have products
    const categoriesWithProducts = await prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
      SELECT DISTINCT c.id, c.name, c.slug
      FROM categories c
      INNER JOIN products p ON p.category_id = c.id
      WHERE NOT EXISTS (SELECT 1 FROM categories child WHERE child.parent_id = c.id)
    `;

    console.log(`Found ${categoriesWithProducts.length} leaf categories with products`);

    // Step 2: Create default cells for each leaf category
    for (const category of categoriesWithProducts) {
      const cellExists = await prisma.cell.findUnique({
        where: { slug: `${category.slug}-default` }
      });

      if (!cellExists) {
        const cell = await prisma.cell.create({
          data: {
            name: category.name,
            slug: `${category.slug}-default`,
            description: `Default cell for ${category.name}`,
            categoryId: category.id,
            sortOrder: 0,
            isActive: true,
          }
        });

        console.log(`Created cell: ${cell.name} (${cell.slug})`);

        // Step 3: Update all products in this category to point to the new cell
        const updatedProducts = await prisma.product.updateMany({
          where: { categoryId: category.id },
          data: { cellId: cell.id }
        });

        console.log(`Updated ${updatedProducts.count} products to cell ${cell.id}`);
      } else {
        console.log(`Cell already exists for category ${category.name}: ${cellExists.slug}`);

        // Update products to point to existing cell
        const updatedProducts = await prisma.product.updateMany({
          where: { categoryId: category.id, cellId: null },
          data: { cellId: cellExists.id }
        });

        console.log(`Updated ${updatedProducts.count} products to existing cell ${cellExists.id}`);
      }
    }

    console.log('Cell data migration completed successfully');
  } catch (error) {
    console.error('Error during cell data migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateCellData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
