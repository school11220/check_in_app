import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const cols: any = await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name ILIKE 'event' ORDER BY ordinal_position;`
    );
    console.log(JSON.stringify(cols, null, 2));
  } catch (err) {
    console.error('Inspect failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
