import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Event" WHERE name = 'Live Verification Event (raw)' ORDER BY "createdAt" DESC LIMIT 1`
    );
    const ev = rows && rows[0];
    if (!ev) {
      console.log('not found');
    } else {
      console.log(JSON.stringify(ev, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
