import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from project root (monorepo root)
config({ path: resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Data migration script to convert existing boolean attribute values
 * from textValue ("true"/"false") to booleanValue (true/false)
 *
 * This script should be run once after applying the schema migration
 * that adds the booleanValue column.
 */
async function migrateBooleanAttributes() {
  console.log('Starting migration of boolean attributes...');

  try {
    // Find all variant attribute values that have textValue set to "true" or "false"
    // and belong to BOOLEAN type attributes
    const booleanAttributeValues = await prisma.variantAttributeValue.findMany({
      where: {
        textValue: {
          in: ['true', 'false'],
        },
      },
      include: {
        attribute: true,
      },
    });

    console.log(`Found ${booleanAttributeValues.length} potential boolean values to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const attrValue of booleanAttributeValues) {
      // Only migrate if the attribute is actually a BOOLEAN type
      if (attrValue.attribute.dataType !== 'BOOLEAN') {
        console.log(`Skipping attribute ${attrValue.id} - not a BOOLEAN type`);
        skippedCount++;
        continue;
      }

      // Convert textValue to boolean
      const booleanValue = attrValue.textValue === 'true';

      console.log(
        `Migrating attribute value ${attrValue.id}: ` +
        `textValue="${attrValue.textValue}" -> booleanValue=${booleanValue}`,
      );

      // Update the record
      await prisma.variantAttributeValue.update({
        where: { id: attrValue.id },
        data: {
          booleanValue,
        },
      });

      migratedCount++;
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total records processed: ${booleanAttributeValues.length}`);
    console.log(`Records migrated: ${migratedCount}`);
    console.log(`Records skipped: ${skippedCount}`);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run the migration
migrateBooleanAttributes()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
