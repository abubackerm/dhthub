import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['power-transmission', 'clutches'],
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      path: true,
      isActive: true,
    },
    orderBy: {
      path: 'asc',
    },
  });

  console.log('Categories found:');
  console.log(JSON.stringify(categories, null, 2));

  // Find all categories that have clutches in their path
  const clutchCategories = await prisma.category.findMany({
    where: {
      path: {
        contains: 'clutches',
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      path: true,
      isActive: true,
      _count: {
        select: {
          children: true,
          cells: true,
        },
      },
    },
    orderBy: {
      path: 'asc',
    },
  });

  console.log('\nAll categories with "clutches" in path:');
  console.log(JSON.stringify(clutchCategories, null, 2));

  // Check the specific path structure
  const specificPath = await prisma.category.findMany({
    where: {
      path: {
        startsWith: 'power-transmission',
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      path: true,
      isActive: true,
      _count: {
        select: {
          children: true,
          cells: true,
        },
      },
    },
    orderBy: {
      path: 'asc',
    },
  });

  console.log('\nAll categories under power-transmission:');
  console.log(JSON.stringify(specificPath, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
