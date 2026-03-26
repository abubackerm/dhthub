import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCellData() {
  console.log('=== Checking Cell Data ===\n');

  // Check all cells
  const cells = await prisma.cell.findMany({
    include: {
      category: true,
      images: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
    take: 5,
  });

  console.log(`Found ${cells.length} cells:`);
  cells.forEach((cell, idx) => {
    console.log(`\n${idx + 1}. ${cell.name}`);
    console.log(`   ID: ${cell.id}`);
    console.log(`   SKU: ${cell.sku || 'NULL'}`);
    console.log(`   Image URL: ${cell.imageUrl || 'NULL'}`);
    console.log(`   Slug: ${cell.slug}`);
    console.log(`   Category: ${cell.category?.name || 'NULL'}`);
    console.log(`   Images count: ${cell.images?.length || 0}`);
    if (cell.images?.length > 0) {
      cell.images.forEach(img => {
        console.log(`      - Position ${img.position}: ${img.storagePath} (SKU: ${img.sku})`);
      });
    }
  });

  // Check categories
  console.log('\n=== Checking Category Data ===\n');
  const categories = await prisma.category.findMany({
    where: {
      name: 'Hardware',
    },
    include: {
      images: true,
    },
  });

  console.log(`Found ${categories.length} categories named 'Hardware':`);
  categories.forEach((cat, idx) => {
    console.log(`\n${idx + 1}. ${cat.name}`);
    console.log(`   ID: ${cat.id}`);
    console.log(`   SKU: ${cat.sku || 'NULL'}`);
    console.log(`   Image URL: ${cat.imageUrl || 'NULL'}`);
    console.log(`   Slug: ${cat.slug}`);
    console.log(`   Images count: ${cat.images?.length || 0}`);
  });

  await prisma.$disconnect();
}

checkCellData().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
