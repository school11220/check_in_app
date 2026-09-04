import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CHECKIN_ROLES, getSession, hasEventAccess, hasRole } from '@/lib/auth';
import { DEFAULT_CHECKIN_POLICY, readCheckInPolicy } from '@/lib/checkin-policy';
import { readEventSettings } from '@/lib/event-settings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!hasRole(session.user.role, CHECKIN_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const eventId = request.nextUrl.searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
  if (!hasEventAccess(session, eventId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const config = await prisma.siteConfig.findUnique({ where: { id: 'default' }, select: { settings: true } });
  const policy = readCheckInPolicy(config?.settings);
  const eventSettings = readEventSettings(config?.settings, eventId);
  return NextResponse.json({
    ...policy,
    eventId,
    organizerApproved: policy.organizerApprovedEventIds.includes(eventId),
    eventSettings,
    manualAllowed: session.user.role === 'ADMIN' || (eventSettings.checkIn.manualEnabled && policy.manualCheckInEnabled && policy.organizerApprovedEventIds.includes(eventId)),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  if (session.user.role !== 'ADMIN' && (!eventId || !hasEventAccess(session, eventId))) {
    return NextResponse.json({ error: 'You cannot change this event policy' }, { status: 403 });
  }
  const config = await prisma.siteConfig.findUnique({ where: { id: 'default' }, select: { settings: true } });
  const existingSettings = config?.settings && typeof config.settings === 'object' ? config.settings as Record<string, unknown> : {};
  const current = readCheckInPolicy(existingSettings);
  let next = { ...current };
  if (session.user.role === 'ADMIN') {
    if (typeof body.manualCheckInEnabled === 'boolean') next.manualCheckInEnabled = body.manualCheckInEnabled;
    next.requireManualReason = true;
  }
  if (eventId && typeof body.organizerApproved === 'boolean') {
    const ids = new Set(next.organizerApprovedEventIds);
    body.organizerApproved ? ids.add(eventId) : ids.delete(eventId);
    next.organizerApprovedEventIds = Array.from(ids);
  }
  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', settings: { ...existingSettings, checkInPolicy: next } },
    update: { settings: { ...existingSettings, checkInPolicy: next } },
  });
  return NextResponse.json({ ...DEFAULT_CHECKIN_POLICY, ...next });
}
