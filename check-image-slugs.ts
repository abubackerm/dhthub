import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CHECKING CELL SLUGS ===\n');

  const cells = await prisma.cell.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
    },
    take: 20,
  });

  console.log(`Found ${cells.length} cells:\n`);
  cells.forEach((cell, i) => {
    console.log(`${i + 1}. Slug: "${cell.slug}" | ID: ${cell.id} | Name: ${cell.name}`);
    console.log(`   Expected image: images/cell/${cell.slug}-1.jpg`);
  });

  console.log('\n=== CHECKING PRODUCT SLUGS ===\n');

  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
    },
    take: 20,
  });

  console.log(`Found ${products.length} products:\n`);
  products.forEach((product, i) => {
    console.log(`${i + 1}. Slug: "${product.slug}" | ID: ${product.id} | Name: ${product.name}`);
    console.log(`   Expected image: images/product/${product.slug}-1.jpg`);
  });

  console.log('\n=== YOUR ZIP FILE NAMES ===\n');
  console.log('Make sure your image filenames match these exact slugs!\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
