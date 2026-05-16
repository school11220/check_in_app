import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeTicketAccess } from '@/lib/ticket-access';
import { generateTicketToken } from '@/lib/ticket-security';

function serializeTicket(ticket: any) {
  const { Event, event, ...ticketData } = ticket;
  const eventData = event || Event;
  return {
    ...ticketData,
    amountPaid: ticketData.amountPaid || (ticketData.status === 'paid' ? eventData?.price || 0 : 0),
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
      return NextResponse.json(
        { error: 'Ticket token or authorized session required' },
        { status: 401 }
      );
    }

    if (ticket.status === 'paid' && !ticket.token && (access.canManage || access.isOwner || access.hasValidToken)) {
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
