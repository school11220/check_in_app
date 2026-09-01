import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { attendeeSegmentFiltersSchema, buildAttendeeWhere } from '@/lib/attendee-segments';

export const dynamic = 'force-dynamic';

const segmentInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  eventId: z.string().trim().min(1).optional().nullable(),
  filters: attendeeSegmentFiltersSchema,
});

async function requireManager() {
  const session = await getSession();
  if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) return null;
  return session;
}

async function accessibleEventIds(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (session.user.role === 'ADMIN') {
    return (await prisma.event.findMany({ select: { id: true } })).map((event) => event.id);
  }
  return session.user.assignedEventIds || [];
}

export async function GET() {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowedIds = await accessibleEventIds(session);
  const segments = await prisma.attendeeSegment.findMany({
    where: session.user.role === 'ADMIN'
      ? undefined
      : { OR: [{ eventId: { in: allowedIds } }, { eventId: null, createdBy: session.user.id }] },
    include: { Event: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  const enriched = await Promise.all(segments.map(async (segment) => {
    const filters = attendeeSegmentFiltersSchema.parse(segment.filters || {});
    const eventIds = segment.eventId ? [segment.eventId] : allowedIds;
    const count = await prisma.ticket.count({ where: buildAttendeeWhere(filters, eventIds) });
    return { ...segment, filters, count, event: segment.Event };
  }));
  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = segmentInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid segment', details: parsed.error.issues }, { status: 400 });
  if (parsed.data.eventId && !hasEventAccess(session, parsed.data.eventId)) {
    return NextResponse.json({ error: 'You do not have access to this event' }, { status: 403 });
  }
  if (parsed.data.eventId && !(await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true } }))) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  const segment = await prisma.attendeeSegment.create({
    data: { ...parsed.data, description: parsed.data.description || null, eventId: parsed.data.eventId || null, createdBy: session.user.id },
  });
  return NextResponse.json(segment, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string().min(1) }).and(segmentInputSchema).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid segment', details: parsed.error.issues }, { status: 400 });
  const existing = await prisma.attendeeSegment.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && existing.createdBy !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (parsed.data.eventId && !hasEventAccess(session, parsed.data.eventId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const updated = await prisma.attendeeSegment.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, description: parsed.data.description || null, eventId: parsed.data.eventId || null, filters: parsed.data.filters },
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Segment ID required' }, { status: 400 });
  const existing = await prisma.attendeeSegment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && existing.createdBy !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.attendeeSegment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
