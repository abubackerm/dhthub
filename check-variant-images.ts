import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVariantImages() {
  console.log('=== Variant Images in Database ===\n');

  // Check if variant_images table has any records
  const imageCount = await prisma.variantImage.count();
  console.log(`Total variant images: ${imageCount}\n`);

  if (imageCount > 0) {
    // Get recent images
    const recentImages = await prisma.variantImage.findMany({
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log('Recent variant images:');
    recentImages.forEach((img, idx) => {
      console.log(`\n${idx + 1}. ID: ${img.id}`);
      console.log(`   SKU: ${img.sku}`);
      console.log(`   Variant ID: ${img.variant.id}`);
      console.log(`   Position: ${img.position}`);
      console.log(`   Is Primary: ${img.isPrimary}`);
      console.log(`   Storage Path: ${img.storagePath}`);
      console.log(`   Created: ${img.createdAt.toISOString()}`);
    });

    // Check for SKU 91578A204 specifically
    const sku915Images = await prisma.variantImage.findMany({
      where: { sku: '91578A204' },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    console.log(`\n\n=== Images for SKU 91578A204 ===`);
    console.log(`Found ${sku915Images.length} image(s):\n`);
    sku915Images.forEach((img) => {
      console.log(`- Position ${img.position}: ${img.storagePath} (Primary: ${img.isPrimary})`);
    });
  } else {
    console.log('No variant images found in database.');
  }

  // Check if SKU 91578A204 exists in product_variants
  const variant = await prisma.productVariant.findFirst({
    where: { sku: '91578A204' },
    select: { id: true, sku: true, productId: true },
  });

  console.log(`\n=== SKU 91578A204 in product_variants ===`);
  if (variant) {
    console.log(`Found variant: ID=${variant.id}, SKU=${variant.sku}, ProductID=${variant.productId}`);
  } else {
    console.log('SKU 91578A204 NOT found in product_variants table!');
    console.log('This would cause all images for this SKU to be skipped.');
  }

  await prisma.$disconnect();
}

checkVariantImages().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
