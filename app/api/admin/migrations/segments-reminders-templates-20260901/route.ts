import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timingSafeStringEqual } from '@/lib/ticket-security';

export const dynamic = 'force-dynamic';

const MIGRATION_NAME = '20260901120000_add_segments_reminders_templates';
const MIGRATION_CHECKSUM = 'b5624a79dcdfa93f2e0b5c72f467d79ccb14d171c49dc4e7ffd4e739222cf284';

export async function POST(request: NextRequest) {
  const expected = process.env.EVENTHUB_SCHEMA_MIGRATION_TOKEN || '';
  const authorization = request.headers.get('authorization') || '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!expected || !provided || !timingSafeStringEqual(expected, provided)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const statements = [`
      CREATE TABLE IF NOT EXISTS "AttendeeSegment" (
        "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "eventId" TEXT,
        "filters" JSONB NOT NULL DEFAULT '{}', "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "AttendeeSegment_pkey" PRIMARY KEY ("id")
      )`, `
      CREATE TABLE IF NOT EXISTS "EventTemplate" (
        "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "sourceEventId" TEXT,
        "data" JSONB NOT NULL, "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
      )`, `
      CREATE TABLE IF NOT EXISTS "ReminderSchedule" (
        "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
        "offsetsMinutes" INTEGER[] NOT NULL DEFAULT ARRAY[10080, 1440, 120]::INTEGER[],
        "channels" TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[], "createdBy" TEXT NOT NULL,
        "lastProcessedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReminderSchedule_pkey" PRIMARY KEY ("id")
      )`, `
      CREATE TABLE IF NOT EXISTS "ReminderDelivery" (
        "id" TEXT NOT NULL, "scheduleId" TEXT NOT NULL, "ticketId" TEXT NOT NULL,
        "channel" TEXT NOT NULL, "offsetMinutes" INTEGER NOT NULL, "scheduledFor" TIMESTAMP(3) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending', "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastAttemptAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "error" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ReminderDelivery_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ReminderSchedule_eventId_key" ON "ReminderSchedule"("eventId")`,
      `CREATE INDEX IF NOT EXISTS "AttendeeSegment_eventId_idx" ON "AttendeeSegment"("eventId")`,
      `CREATE INDEX IF NOT EXISTS "AttendeeSegment_createdBy_idx" ON "AttendeeSegment"("createdBy")`,
      `CREATE INDEX IF NOT EXISTS "AttendeeSegment_updatedAt_idx" ON "AttendeeSegment"("updatedAt")`,
      `CREATE INDEX IF NOT EXISTS "EventTemplate_createdBy_idx" ON "EventTemplate"("createdBy")`,
      `CREATE INDEX IF NOT EXISTS "EventTemplate_updatedAt_idx" ON "EventTemplate"("updatedAt")`,
      `CREATE INDEX IF NOT EXISTS "ReminderSchedule_enabled_idx" ON "ReminderSchedule"("enabled")`,
      `CREATE INDEX IF NOT EXISTS "ReminderSchedule_updatedAt_idx" ON "ReminderSchedule"("updatedAt")`, `
      CREATE UNIQUE INDEX IF NOT EXISTS "ReminderDelivery_scheduleId_ticketId_channel_offsetMinutes_scheduledFor_key"
        ON "ReminderDelivery"("scheduleId", "ticketId", "channel", "offsetMinutes", "scheduledFor")`,
      `CREATE INDEX IF NOT EXISTS "ReminderDelivery_status_scheduledFor_idx" ON "ReminderDelivery"("status", "scheduledFor")`,
      `CREATE INDEX IF NOT EXISTS "ReminderDelivery_ticketId_idx" ON "ReminderDelivery"("ticketId")`,
      `CREATE INDEX IF NOT EXISTS "ReminderDelivery_scheduleId_createdAt_idx" ON "ReminderDelivery"("scheduleId", "createdAt")`, `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendeeSegment_eventId_fkey') THEN
          ALTER TABLE "AttendeeSegment" ADD CONSTRAINT "AttendeeSegment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReminderSchedule_eventId_fkey') THEN
          ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReminderDelivery_scheduleId_fkey') THEN
          ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReminderSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReminderDelivery_ticketId_fkey') THEN
          ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$
    `];
    for (const statement of statements) await prisma.$executeRawUnsafe(statement);

    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('AttendeeSegment', 'EventTemplate', 'ReminderSchedule', 'ReminderDelivery')
      ORDER BY table_name
    `);
    if (tables.length !== 4) throw new Error('Not all feature tables were created');

    const migrationRegistry = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists`,
    );
    if (migrationRegistry[0]?.exists) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         SELECT $1, $2, CURRENT_TIMESTAMP, $3, NULL, NULL, CURRENT_TIMESTAMP, 1
         WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $3)`,
        crypto.randomUUID(), MIGRATION_CHECKSUM, MIGRATION_NAME,
      );
    }

    return NextResponse.json({ success: true, tables: tables.map((row) => row.table_name), migration: MIGRATION_NAME, migrationTracked: migrationRegistry[0]?.exists === true });
  } catch (error) {
    console.error('Feature table migration failed', error);
    return NextResponse.json({ success: false, error: 'Schema migration failed' }, { status: 500 });
  }
}
