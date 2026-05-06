/**
 * Simple Search Reindex Script
 * Direct database to Meilisearch indexing without NestJS app context
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env FIRST before any other imports
dotenv.config({ path: join(__dirname, '../../../../.env') });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { MeiliSearch } from 'meilisearch';

async function reindex() {
  console.log('🚀 Starting search index reindex...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'NOT SET ✗');
  console.log('MEILISEARCH_HOST:', process.env.MEILISEARCH_HOST || 'http://127.0.0.1');
  console.log('MEILISEARCH_PORT:', process.env.MEILISEARCH_PORT || 7700);
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const meili = new MeiliSearch({
    host: `${process.env.MEILISEARCH_HOST || 'http://127.0.0.1'}:${process.env.MEILISEARCH_PORT || 7700}`,
    apiKey: process.env.MEILISEARCH_MASTER_KEY,
  });

  try {
    // Get or create index
    const index = meili.index('variants');
    
    console.log('📦 Fetching variants from database...');
    const variants = await prisma.productVariant.findMany({
      include: {
        product: {
          include: {
            cell: {
              include: {
                category: true,
              },
            },
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    console.log(`Found ${variants.length} variants to index`);

    // Build documents
    const documents = await Promise.all(
      variants.map(async (variant) => {
        const [attributes, pricing, inventory] = await Promise.all([
          prisma.variantAttributeValue.findMany({
            where: { variantId: variant.id },
            include: {
              attribute: true,
              option: true,
            },
          }),
          prisma.price.findFirst({
            where: { variantId: variant.id },
            include: {
              currency: true,
              tiers: {
                orderBy: { minQty: 'asc' },
                take: 1,
              },
            },
          }),
          prisma.inventoryLevel.findMany({
            where: { variantId: variant.id },
          }),
        ]);

        const normalizedAttributes: Record<string, string | number | boolean> = {};
        for (const value of attributes) {
          const { attribute, option } = value;
          if (attribute.dataType === 'number') {
            normalizedAttributes[attribute.slug] = value.numberValue ?? 0;
          } else if (attribute.dataType === 'text') {
            normalizedAttributes[attribute.slug] = value.textValue ?? '';
          } else if (attribute.dataType === 'boolean') {
            normalizedAttributes[attribute.slug] = value.booleanValue ?? false;
          } else if (attribute.dataType === 'enum' && option) {
            normalizedAttributes[attribute.slug] = option.label;
          }
        }

        const stock = inventory.reduce(
          (sum, level: any) => sum + (level.availableQty ?? 0),
          0,
        );

        return {
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.product.name,
          sku: variant.sku,
          cellId: variant.product.cellId,
          categoryId: variant.product.cell?.categoryId ?? null,
          categoryPath: variant.product.cell?.category?.path ?? null,
          categoryName: variant.product.cell?.category?.name ?? null,
          cellName: variant.product.cell?.name ?? null,
          price: pricing?.tiers[0]?.unitPrice?.toNumber() ?? 0,
          currency: pricing?.currency?.code ?? 'SAR',
          stock,
          image: variant.images[0]?.url ?? null,
          attributes: normalizedAttributes,
        };
      })
    );

    console.log('📝 Indexing documents in Meilisearch...');
    await index.addDocuments(documents);

    console.log('✅ Reindex completed successfully!');
    console.log(`Indexed ${documents.length} variants`);
  } catch (error) {
    console.error('❌ Reindex failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

reindex()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
