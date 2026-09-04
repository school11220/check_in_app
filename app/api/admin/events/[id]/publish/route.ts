import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/logger';
import { badRequest, unauthorized, forbidden, notFound, respond } from '@/lib/api-helpers';

export const POST = respond(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session) throw unauthorized();
  if (session.user.role !== 'ADMIN') throw forbidden('Only admins can approve event publication');

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, name: true, publicationStatus: true } });
  if (!event) throw notFound('Event not found');

  let body: { action?: string } = {};
  try { body = await request.json(); } catch { /* default to approve */ }
  const action = body.action || 'approve';
  if (!['approve', 'unpublish'].includes(action)) throw badRequest('Action must be approve or unpublish');

  const publicationStatus = action === 'approve' ? 'published' : 'draft';
  const updated = await prisma.event.update({
    where: { id },
    data: {
      publicationStatus,
      publishApprovedBy: action === 'approve' ? session.user.id : null,
      publishApprovedAt: action === 'approve' ? new Date() : null,
    },
  });

  await logAudit({
    action: 'UPDATE',
    resource: 'EVENT',
    resourceId: id,
    details: { eventName: event.name, publicationStatus },
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    userRole: session.user.role,
  });

  return NextResponse.json({ success: true, event: updated });
}, { auth: 'admin' });
