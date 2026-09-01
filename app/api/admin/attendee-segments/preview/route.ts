import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { attendeeSegmentFiltersSchema, buildAttendeeWhere } from '@/lib/attendee-segments';

const inputSchema = z.object({ eventId: z.string().optional().nullable(), filters: attendeeSegmentFiltersSchema });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid filters', details: parsed.error.issues }, { status: 400 });
  if (parsed.data.eventId && !hasEventAccess(session, parsed.data.eventId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const eventIds = parsed.data.eventId
    ? [parsed.data.eventId]
    : session.user.role === 'ADMIN'
      ? (await prisma.event.findMany({ select: { id: true } })).map((event) => event.id)
      : session.user.assignedEventIds || [];
  const where = buildAttendeeWhere(parsed.data.filters, eventIds);
  const [count, attendees] = await prisma.$transaction([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, status: true, checkedIn: true, createdAt: true, Event: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  return NextResponse.json({ count, attendees: attendees.map((ticket) => ({ ...ticket, event: ticket.Event })) });
}
