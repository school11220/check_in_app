import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { DEFAULT_REMINDER_OFFSETS, processDueReminders } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

const scheduleSchema = z.object({
  eventId: z.string().min(1),
  enabled: z.boolean(),
  offsetsMinutes: z.array(z.number().int().min(15).max(525600)).min(1).max(10).default(DEFAULT_REMINDER_OFFSETS),
  channels: z.array(z.enum(['email', 'sms'])).min(1).max(2),
});

export async function GET() {
  const session = await getSession();
  if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const where = session.user.role === 'ADMIN' ? {} : { eventId: { in: session.user.assignedEventIds || [] } };
  const schedules = await prisma.reminderSchedule.findMany({
    where,
    include: {
      Event: { select: { id: true, name: true, date: true, startTime: true, sendReminders: true } },
      Deliveries: { select: { status: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(schedules.map((schedule) => ({
    ...schedule,
    event: schedule.Event,
    deliveryStats: schedule.Deliveries.reduce<Record<string, number>>((stats, item) => ({ ...stats, [item.status]: (stats[item.status] || 0) + 1 }), {}),
    Deliveries: undefined,
  })));
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid reminder schedule', details: parsed.error.issues }, { status: 400 });
  if (!hasEventAccess(session, parsed.data.eventId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const eventExists = await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true } });
  if (!eventExists) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const schedule = await prisma.$transaction(async (tx) => {
    const saved = await tx.reminderSchedule.upsert({
      where: { eventId: parsed.data.eventId },
      create: { ...parsed.data, createdBy: session.user.id },
      update: { enabled: parsed.data.enabled, offsetsMinutes: parsed.data.offsetsMinutes, channels: parsed.data.channels },
    });
    await tx.event.update({ where: { id: parsed.data.eventId }, data: { sendReminders: parsed.data.enabled } });
    return saved;
  });
  return NextResponse.json(schedule);
}

export async function POST() {
  const session = await getSession();
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await processDueReminders());
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = z.object({ eventId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
  if (!hasEventAccess(session, parsed.data.eventId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const result = await prisma.reminderDelivery.updateMany({
    where: { Schedule: { eventId: parsed.data.eventId }, status: 'failed' },
    data: { status: 'pending', attempts: 0, error: null, lastAttemptAt: null },
  });
  return NextResponse.json({ success: true, reset: result.count });
}
