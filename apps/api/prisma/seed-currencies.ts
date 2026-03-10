import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

async function main() {
  console.log('🌱 Seeding currencies...');

  const currencies = [
    { code: 'USD', symbol: '$', decimals: 2 },
    { code: 'EUR', symbol: '€', decimals: 2 },
    { code: 'INR', symbol: '₹', decimals: 2 },
    { code: 'AED', symbol: 'د.إ', decimals: 2 },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
    console.log(`✅ Created currency: ${currency.code}`);
  }

  console.log('✨ Currency seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding currencies:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
