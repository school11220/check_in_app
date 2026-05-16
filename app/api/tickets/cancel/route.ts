import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { isPaidLikeStatus } from '@/lib/ticket-lifecycle';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!hasRole(session.user.role, ORGANIZER_ROLES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, reason } = body;
    if (!ticketId) return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });

    const rateLimited = await enforceRateLimit(request, 'ticket-cancel', { requests: 5, window: '1 m' }, session.user.id);
    if (rateLimited) return rateLimited;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { Event: true },
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (!hasEventAccess(session, ticket.eventId)) {
      return NextResponse.json({ error: 'You do not have access to this event' }, { status: 403 });
    }
    if (ticket.checkedIn) {
      return NextResponse.json({ error: 'Checked-in tickets cannot be cancelled. Undo check-in first.' }, { status: 400 });
    }
    if (ticket.status === 'cancelled') {
      return NextResponse.json({ error: 'Ticket already cancelled' }, { status: 400 });
    }
    if (ticket.status === 'refunded') {
      return NextResponse.json({ error: 'Refunded tickets are already closed' }, { status: 400 });
    }
    if (isPaidLikeStatus(ticket.status)) {
      return NextResponse.json({ error: 'Paid tickets must be refunded instead of cancelled' }, { status: 400 });
    }

    const cancelledAt = new Date();
    const [, updatedTicket] = await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          id: `cancel-${ticketId}-${Date.now()}`,
          action: 'CANCEL_TICKET',
          resource: 'ticket',
          resourceId: ticketId,
          details: {
            reason: reason || null,
            attendeeName: ticket.name,
            attendeeEmail: ticket.email,
            eventName: ticket.Event.name,
            previousStatus: ticket.status,
          },
          userId: session.user.id,
          userName: session.user.name || session.user.email,
          userRole: session.user.role,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'cancelled',
          cancelledAt,
          updatedAt: cancelledAt,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      ticketId: updatedTicket.id,
      status: updatedTicket.status,
      cancelledAt,
    });
  } catch (error: any) {
    console.error('Cancel ticket error:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel ticket' }, { status: 500 });
  }
}
