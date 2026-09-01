import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { snapshotEventTemplate, templateChildren, templateEventCreateData } from '@/lib/event-templates';
import { logAudit } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function requireManager() {
  const session = await getSession();
  return session && hasRole(session.user.role, ORGANIZER_ROLES) ? session : null;
}

export async function GET() {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const templates = await prisma.eventTemplate.findMany({
    where: session.user.role === 'ADMIN' ? undefined : { createdBy: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const action = body?.action || 'save';

  if (action === 'save') {
    const parsed = z.object({
      sourceEventId: z.string().min(1), name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid template', details: parsed.error.issues }, { status: 400 });
    if (!hasEventAccess(session, parsed.data.sourceEventId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const event = await prisma.event.findUnique({
      where: { id: parsed.data.sourceEventId },
      include: { PricingRule: true, Session: true },
    });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const snapshot = {
      ...snapshotEventTemplate(event as unknown as Record<string, unknown>),
      _pricingRules: event.PricingRule.map(({ triggerType, triggerValue, adjustmentType, adjustmentValue, active }) => ({ triggerType, triggerValue, adjustmentType, adjustmentValue, active })),
      _sessions: event.Session.map(({ title, description, type, speakerName, speakerRole, startTime, endTime, date, capacity }) => ({ title, description, type, speakerName, speakerRole, startTime, endTime, date, capacity })),
    };
    const template = await prisma.eventTemplate.create({
      data: { name: parsed.data.name, description: parsed.data.description || null, sourceEventId: event.id, data: snapshot, createdBy: session.user.id },
    });
    return NextResponse.json(template, { status: 201 });
  }

  if (action === 'create-event') {
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Only admins can create events from templates' }, { status: 403 });
    const parsed = z.object({ templateId: z.string().min(1), eventName: z.string().trim().min(1).max(160), eventDate: z.string().datetime() }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid event details', details: parsed.error.issues }, { status: 400 });
    const template = await prisma.eventTemplate.findUnique({ where: { id: parsed.data.templateId } });
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    const children = templateChildren(template.data);
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({ data: templateEventCreateData(template.data, { name: parsed.data.eventName, date: new Date(parsed.data.eventDate), organizerId: session.user.id }) });
      if (children.pricingRules.length) {
        await tx.pricingRule.createMany({
          data: children.pricingRules.map((rule: any) => ({ id: crypto.randomUUID(), eventId: created.id, triggerType: String(rule.triggerType), triggerValue: Number(rule.triggerValue), adjustmentType: String(rule.adjustmentType), adjustmentValue: Number(rule.adjustmentValue), active: rule.active !== false })),
        });
      }
      if (children.sessions.length) {
        await tx.session.createMany({
          data: children.sessions.map((item: any) => ({ id: crypto.randomUUID(), eventId: created.id, title: String(item.title), description: item.description ? String(item.description) : null, type: String(item.type || 'talk'), speakerName: item.speakerName ? String(item.speakerName) : null, speakerRole: item.speakerRole ? String(item.speakerRole) : null, startTime: String(item.startTime), endTime: String(item.endTime), date: String(item.date), capacity: Math.max(1, Number(item.capacity) || 100), registeredCount: 0 })),
        });
      }
      return created;
    });
    await logAudit({ action: 'CREATE', resource: 'EVENT', resourceId: event.id, details: { templateId: template.id, eventName: event.name }, userId: session.user.id, userName: session.user.name || session.user.email, userRole: session.user.role });
    return NextResponse.json(event, { status: 201 });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional().nullable() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid template', details: parsed.error.issues }, { status: 400 });
  const existing = await prisma.eventTemplate.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && existing.createdBy !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.eventTemplate.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, description: parsed.data.description || null } }));
}

export async function DELETE(request: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  const existing = await prisma.eventTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && existing.createdBy !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.eventTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
