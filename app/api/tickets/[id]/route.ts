import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeTicketAccess } from '@/lib/ticket-access';
import { generateTicketToken } from '@/lib/ticket-security';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logSecurityEvent, isSecurityKeyBlocked } from '@/lib/security-events';
import { getTicketFinancials, getTicketLifecycleStatus, isPaidLikeStatus } from '@/lib/ticket-lifecycle';

function serializeTicket(ticket: any) {
  const { Event, event, ...ticketData } = ticket;
  const eventData = event || Event;
  const financials = getTicketFinancials(ticketData, eventData?.price || 0);
  return {
    ...ticketData,
    ...financials,
    lifecycleStatus: getTicketLifecycleStatus(ticketData),
    event: eventData,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const providedToken = url.searchParams.get('token');
    const rateLimited = await enforceRateLimit(req, 'ticket-lookup', { requests: 20, window: '1 m' }, id);
    if (rateLimited) return rateLimited;

    const abuseKey = `ticket:${id}`;
    if (await isSecurityKeyBlocked('invalid_ticket_access', abuseKey, 12, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many invalid ticket access attempts. Please try again later.' }, { status: 429 });
    }

    let ticket: any = await prisma.ticket.findUnique({
      where: { id },
      include: { Event: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const access = await authorizeTicketAccess(ticket, providedToken);
    if (!access.allowed) {
      await logSecurityEvent(req, {
        type: 'invalid_ticket_access',
        key: abuseKey,
        ticketId: id,
        eventId: ticket.eventId,
      });
      return NextResponse.json(
        { error: 'Ticket token or authorized session required' },
        { status: 401 }
      );
    }

    if (isPaidLikeStatus(ticket.status) && !ticket.token && (access.canManage || access.isOwner || access.hasValidToken)) {
      const token = generateTicketToken(id);
      ticket = await prisma.ticket.update({
        where: { id },
        data: { token },
        include: { Event: true },
      });
    }

    return NextResponse.json({ ticket: serializeTicket(ticket) });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
