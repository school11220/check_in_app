import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { ticketStorage } from '@/lib/ticket-storage';

// Fallback events data
const FALLBACK_EVENTS: Record<string, { name: string; price: number; date: string; venue: string; description: string }> = {
  'event-1': {
    name: 'Tech Conference 2025',
    price: 50000,
    date: '2025-02-15T09:00:00Z',
    venue: 'Convention Center, Bangalore',
    description: 'Annual technology conference'
  },
  'event-2': {
    name: 'Music Festival Night',
    price: 200000,
    date: '2025-01-25T18:00:00Z',
    venue: 'Stadium Ground, Mumbai',
    description: 'Live performances by top artists'
  },
  'event-3': {
    name: 'Startup Meetup',
    price: 20000,
    date: '2025-01-20T16:00:00Z',
    venue: 'WeWork, Delhi',
    description: 'Network with founders and investors'
  },
  'event-4': {
    name: 'Art Exhibition Opening',
    price: 10000,
    date: '2025-02-01T17:00:00Z',
    venue: 'Art Gallery, Chennai',
    description: 'Exclusive preview of contemporary art'
  },
};

function generateToken(ticketId: string): string {
  const secret = process.env.TICKET_SECRET_KEY || 'default-secret-key-for-demo';
  return crypto.createHmac('sha256', secret).update(ticketId).digest('hex');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Fetching ticket with ID:', id);

    // Try database first
    let ticket: any = null;
    try {
      ticket = await prisma.ticket.findUnique({
        where: { id },
        include: { Event: true },
      });
      if (ticket) {
        console.log('Ticket found in database:', ticket.id);
      }
    } catch (e) {
      console.log('Database not available, checking in-memory');
    }

    // Check in-memory storage if no database ticket
    if (!ticket) {
      const memoryTicket = ticketStorage.get(id);
      if (memoryTicket) {
        console.log('Ticket found in memory:', memoryTicket.id);
        ticket = { ...memoryTicket };

        // If ticket exists in memory, add event details
        if (ticket.eventId) {
          const eventData = FALLBACK_EVENTS[ticket.eventId];
          if (eventData) {
            ticket.event = {
              id: ticket.eventId,
              name: eventData.name,
              price: eventData.price,
              date: eventData.date,
              venue: eventData.venue,
              description: eventData.description,
            };
          }
        }
      }
    }

    // If still no ticket, create a demo ticket for IDs starting with 'ticket-'
    if (!ticket && id.startsWith('ticket-')) {
      console.log('Creating demo ticket for:', id);
      const token = generateToken(id);
      ticket = {
        id: id,
        name: 'Demo User',
        email: 'demo@example.com',
        phone: '+91 98765 43210',
        eventId: 'event-4',
        status: 'paid',
        token: token,
        checkedIn: false,
        createdAt: new Date().toISOString(),
        event: {
          id: 'event-4',
          ...FALLBACK_EVENTS['event-4']
        },
      };
      // Store for future reference
      ticketStorage.set(id, {
        id: id,
        name: 'Demo User',
        email: 'demo@example.com',
        phone: '+91 98765 43210',
        eventId: 'event-4',
        status: 'paid',
        token: token,
        checkedIn: false,
        createdAt: new Date(),
      });
    }

    if (!ticket) {
      console.log('Ticket not found:', id);
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Ensure token exists for paid tickets
    if (ticket.status === 'paid' && !ticket.token) {
      ticket.token = generateToken(id);
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
