import { PrismaClient } from '@prisma/client';
import { DatabaseProvider } from './apps/api/src/modules/database/database.provider';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking cell slugs in database...\n');

  const cells = await prisma.cell.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  console.log(`Found ${cells.length} cells in database:\n`);
  cells.forEach((cell) => {
    console.log(`  - ${cell.slug} (id: ${cell.id}, name: ${cell.name})`);
  });

  console.log('\nExpected image filenames for cells:');
  cells.forEach((cell) => {
    console.log(`  images/cell/${cell.slug}-1.jpg`);
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
