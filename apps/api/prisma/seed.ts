import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const SUPER_ADMIN_EMAIL = 'supertekadmin@dhthub.com';
const SUPER_ADMIN_PASSWORD = 'Tekdht@2026';
const SUPER_ADMIN_NAME = 'Super Admin';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({
      where: { email: SUPER_ADMIN_EMAIL },
    });

    if (existing) {
      console.log(`Super admin (${SUPER_ADMIN_EMAIL}) already exists, skipping.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    const user = await prisma.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        name: SUPER_ADMIN_NAME,
        passwordHash: hashedPassword,
        role: 'super_admin',
        isActive: true,
        emailVerified: true,
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: hashedPassword,
      },
    });

    console.log('Super admin user created successfully.');
    console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
    console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log(`  Role:     super_admin`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
