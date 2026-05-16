import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';
import { auth } from '@clerk/nextjs/server';

// Fallback events data (same as events/route.ts)
const FALLBACK_EVENTS: Record<string, { name: string; price: number }> = {
  'event-1': { name: 'Tech Conference 2025', price: 50000 },
  'event-2': { name: 'Music Festival Night', price: 200000 },
  'event-3': { name: 'Startup Meetup', price: 20000 },
  'event-4': { name: 'Art Exhibition Opening', price: 30000 },
};

function serializeTicket(ticket: any) {
  const { Event, ...ticketData } = ticket;
  return {
    ...ticketData,
    amountPaid: ticketData.amountPaid || (ticketData.status === 'paid' ? Event?.price || 0 : 0),
    event: Event,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = await auth();

    // Support both single and multi-ticket purchase
    const attendees = Array.isArray(body.attendees) && body.attendees.length > 0
      ? body.attendees
      : [{ name: body.name, email: body.email, phone: body.phone }];
    const quantity = Number(body.quantity || attendees.length || 1);

    // Validate required fields
    if (attendees.length === 0 || !body.eventId || attendees.some((attendee: any) => !String(attendee.name || '').trim())) {
      return NextResponse.json(
        { error: 'Name and event are required for every ticket' },
        { status: 400 }
      );
    }

    if (quantity !== attendees.length) {
      return NextResponse.json(
        { error: 'Ticket quantity does not match attendee count' },
        { status: 400 }
      );
    }

    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: 'You can register between 1 and 10 tickets per order' },
        { status: 400 }
      );
    }

    // Check fallback events first
    const fallbackEvent = FALLBACK_EVENTS[body.eventId];

    // Try database first, then fallback
    let event = null;
    let eventName = '';
    let eventPrice = 0;

    try {
      event = await prisma.event.findUnique({
        where: { id: body.eventId },
      });
      if (event) {
        eventName = event.name;
        eventPrice = event.price;
      }
    } catch (e) {
      console.log('Database not available, using fallback events');
    }

    // Check if event is active or global sales paused
    // Check Global Sales Pause
    const siteConfig = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    const settings = siteConfig?.settings as any;
    if (settings?.globalSalesPaused) {
      return NextResponse.json(
        { error: 'Ticket sales are currently paused globally.' },
        { status: 403 }
      );
    }

    // Note: We need to get global settings from DB or assume active. 
    // Since we don't have easy access to store settings here, we rely on event.isActive for now.
    // Ideally, global settings should be in DB. 
    // For now, we'll check event.isActive if event exists.
    if (event && !event.isActive) {
      return NextResponse.json(
        { error: 'Ticket sales are currently paused for this event' },
        { status: 403 }
      );
    }

    if (event) {
      const paidTicketCount = await prisma.ticket.count({
        where: { eventId: event.id, status: 'paid' },
      });

      if (paidTicketCount + attendees.length > event.capacity) {
        return NextResponse.json(
          { error: 'Not enough tickets are available for this event' },
          { status: 409 }
        );
      }
    }

    // Use fallback if no database event
    if (!event && fallbackEvent) {
      eventName = fallbackEvent.name;
      eventPrice = fallbackEvent.price;
    } else if (!event && !fallbackEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const tickets = await prisma.$transaction(
      attendees.map((attendee: any) => prisma.ticket.create({
        data: {
          id: crypto.randomUUID(),
          name: String(attendee.name || '').trim(),
          email: attendee.email || body.email || null,
          phone: attendee.phone || body.phone || null,
          userId: userId || null,
          eventId: body.eventId,
          status: 'pending',
          customAnswers: body.customAnswers || {},
          updatedAt: new Date(),
        },
      }))
    );

    const ticketIds = tickets.map((ticket) => ticket.id);

    return NextResponse.json({
      ticketId: ticketIds[0], // Primary ticket ID for backwards compatibility
      ticketIds, // All ticket IDs for multi-ticket
      quantity: ticketIds.length,
      eventName,
      price: eventPrice,
      totalPrice: eventPrice * ticketIds.length,
    });
  } catch (error: any) {
    console.error('Error creating ticket(s):', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ticket(s)' },
      { status: 500 }
    );
  }
}

// GET /api/tickets - Get all tickets (for admin)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');

    let tickets: any[] = [];

    try {
      tickets = await prisma.ticket.findMany({
        where: eventId ? { eventId } : {},
        include: { Event: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // Return in-memory tickets if database not available
      tickets = ticketStorage.getAll();
      if (eventId) {
        tickets = tickets.filter(t => t.eventId === eventId);
      }
    }

    return NextResponse.json(tickets.map(serializeTicket));
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
