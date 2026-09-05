import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess } from '@/lib/auth';
import { readEventSettings } from '@/lib/event-settings';
import { badRequest, forbidden, notFound, respond, unauthorized } from '@/lib/api-helpers';

export const GET = respond(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session) throw unauthorized();
  const { id } = await params;
  if (!hasEventAccess(session, id)) throw forbidden('You do not have access to this event');
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, capacity: true, timezone: true } });
  if (!event) throw notFound('Event not found');
  const config = await prisma.siteConfig.findUnique({ where: { id: 'default' }, select: { settings: true } });
  const settings = readEventSettings(config?.settings, id);
  return NextResponse.json({ eventId: id, ...settings, timezone: event.timezone || settings.timezone, capacity: event.capacity });
}, { auth: 'scanner' });

export const PATCH = respond(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session) throw unauthorized();
  const { id } = await params;
  if (!hasEventAccess(session, id)) throw forbidden('You do not have access to this event');
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') throw badRequest('Invalid settings body');
  const currentConfig = await prisma.siteConfig.findUnique({ where: { id: 'default' }, select: { settings: true } });
  const existing = currentConfig?.settings && typeof currentConfig.settings === 'object'
    ? currentConfig.settings as Record<string, unknown> : {};
  const current = readEventSettings(existing, id);
  const requestedCheckIn = body.checkIn && typeof body.checkIn === 'object'
    ? body.checkIn as Record<string, unknown>
    : {};
  const next = {
    ...current,
    timezone: typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : current.timezone,
    checkIn: {
      manualEnabled: typeof requestedCheckIn.manualEnabled === 'boolean' ? requestedCheckIn.manualEnabled : current.checkIn.manualEnabled,
      allowUndo: typeof requestedCheckIn.allowUndo === 'boolean' ? requestedCheckIn.allowUndo : current.checkIn.allowUndo,
      lowLightMode: typeof requestedCheckIn.lowLightMode === 'boolean' ? requestedCheckIn.lowLightMode : current.checkIn.lowLightMode,
    },
    staffAccessIds: Array.isArray(body.staffAccessIds)
      ? body.staffAccessIds.filter((value): value is string => typeof value === 'string') : current.staffAccessIds,
  };
  if (typeof next.checkIn.manualEnabled !== 'boolean' || typeof next.checkIn.allowUndo !== 'boolean' || typeof next.checkIn.lowLightMode !== 'boolean') {
    throw badRequest('Invalid check-in settings');
  }
  if (session.user.role !== 'ADMIN' && (body.capacity !== undefined || body.staffAccessIds !== undefined)) {
    throw forbidden('Only admins can change capacity or staff access');
  }
  const capacity = body.capacity === undefined ? undefined : Number(body.capacity);
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) throw badRequest('Capacity must be a positive whole number');
  if (session.user.role === 'ADMIN' && body.staffAccessIds !== undefined) {
    const client = await clerkClient();
    const affected = new Set([...current.staffAccessIds, ...next.staffAccessIds]);
    await Promise.all(Array.from(affected).map(async (userId) => {
      const user = await client.users.getUser(userId);
      const assigned = new Set(Array.isArray(user.publicMetadata?.assignedEventIds) ? user.publicMetadata.assignedEventIds as string[] : []);
      if (next.staffAccessIds.includes(userId)) assigned.add(id); else if (current.staffAccessIds.includes(userId)) assigned.delete(id);
      await client.users.updateUser(userId, { publicMetadata: { ...user.publicMetadata, assignedEventIds: Array.from(assigned) } });
    }));
  }
  await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id }, data: { ...(capacity !== undefined ? { capacity } : {}), timezone: next.timezone } });
    await tx.siteConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', settings: { ...existing, eventSettings: { [id]: next } } as Prisma.InputJsonValue },
      update: { settings: { ...existing, eventSettings: { ...(existing.eventSettings && typeof existing.eventSettings === 'object' ? existing.eventSettings as Record<string, unknown> : {}), [id]: next } } as Prisma.InputJsonValue },
    });
  });
  return NextResponse.json({ eventId: id, capacity: capacity ?? undefined, ...next });
}, { auth: 'organizer' });
