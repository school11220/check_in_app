import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timingSafeStringEqual } from '@/lib/ticket-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET || '';
  const provided = request.headers.get('x-admin-bootstrap-secret') || '';
  if (!expected || !provided || !timingSafeStringEqual(expected, provided)) {
    return NextResponse.json({ success: false, error: 'Unauthorized', code: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Event"
        ADD COLUMN IF NOT EXISTS "publicationStatus" TEXT NOT NULL DEFAULT 'published',
        ADD COLUMN IF NOT EXISTS "publishApprovedBy" TEXT,
        ADD COLUMN IF NOT EXISTS "publishApprovedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata'
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Event_publicationStatus_date_idx"
      ON "Event"("publicationStatus", "date")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PaymentRecoveryJob" (
        "id" TEXT NOT NULL,
        "provider" TEXT NOT NULL DEFAULT 'razorpay',
        "operation" TEXT NOT NULL,
        "orderId" TEXT,
        "paymentId" TEXT,
        "ticketId" TEXT,
        "eventId" TEXT,
        "payload" JSONB NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PaymentRecoveryJob_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentRecoveryJob_status_nextAttemptAt_idx" ON "PaymentRecoveryJob"("status", "nextAttemptAt")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentRecoveryJob_orderId_idx" ON "PaymentRecoveryJob"("orderId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentRecoveryJob_paymentId_idx" ON "PaymentRecoveryJob"("paymentId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentRecoveryJob_eventId_createdAt_idx" ON "PaymentRecoveryJob"("eventId", "createdAt")`);

    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Event' AND column_name IN ('publicationStatus','publishApprovedBy','publishApprovedAt','timezone') ORDER BY column_name`,
    );
    const tables = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PaymentRecoveryJob') AS exists`,
    );
    return NextResponse.json({ success: true, columns: columns.map((row) => row.column_name), recoveryTable: tables[0]?.exists === true });
  } catch (error) {
    console.error('Event operations schema migration failed', error);
    return NextResponse.json({ success: false, error: 'Schema migration failed', code: 'DATABASE_ERROR' }, { status: 500 });
  }
}
