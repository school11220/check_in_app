import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTicketToken } from '@/lib/utils';
import { CheckInRequest, CheckInResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: CheckInRequest = await req.json();
    
    const { ticketId, token } = body;

    if (!ticketId || !token) {
      return NextResponse.json<CheckInResponse>(
        { 
          success: false, 
          message: 'Ticket ID and token are required' 
        },
        { status: 400 }
      );
    }

    // Fetch ticket from database
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json<CheckInResponse>(
        { 
          success: false, 
          message: 'Ticket not found' 
        },
        { status: 404 }
      );
    }

    // Check if ticket is paid
    if (ticket.status !== 'paid') {
      return NextResponse.json<CheckInResponse>(
        { 
          success: false, 
          message: `Ticket payment is ${ticket.status}` 
        },
        { status: 400 }
      );
    }

    // Verify token
    if (!ticket.token || !verifyTicketToken(ticketId, token)) {
      return NextResponse.json<CheckInResponse>(
        { 
          success: false, 
          message: 'Invalid ticket token' 
        },
        { status: 403 }
      );
    }

    // Check if already checked in
    if (ticket.checkedIn) {
      return NextResponse.json<CheckInResponse>(
        { 
          success: false, 
          message: 'Ticket already checked in',
          ticket: {
            id: ticket.id,
            name: ticket.name,
            email: ticket.email,
            eventId: ticket.eventId,
            checkedIn: ticket.checkedIn,
          }
        },
        { status: 400 }
      );
    }

    // Mark as checked in
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { checkedIn: true },
    });

    return NextResponse.json<CheckInResponse>({
      success: true,
      message: 'Check-in successful',
      ticket: {
        id: updatedTicket.id,
        name: updatedTicket.name,
        email: updatedTicket.email,
        eventId: updatedTicket.eventId,
        checkedIn: updatedTicket.checkedIn,
      },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json<CheckInResponse>(
      { 
        success: false, 
        message: 'Failed to process check-in' 
      },
      { status: 500 }
    );
  }
}
