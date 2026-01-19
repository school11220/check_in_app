import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TicketFormData } from '@/types';
import { ticketStorage } from '@/lib/ticket-storage';

// Fallback events data (same as events/route.ts)
const FALLBACK_EVENTS: Record<string, { name: string; price: number }> = {
  'event-1': { name: 'Tech Conference 2025', price: 50000 },
  'event-2': { name: 'Music Festival Night', price: 200000 },
  'event-3': { name: 'Startup Meetup', price: 20000 },
  'event-4': { name: 'Art Exhibition Opening', price: 30000 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both single and multi-ticket purchase
    const quantity = body.quantity || 1;
    const attendees = body.attendees || [{ name: body.name, email: body.email, phone: body.phone }];

    // Validate required fields
    if (attendees.length === 0 || !attendees[0].name || !body.eventId) {
      return NextResponse.json(
        { error: 'Name and event are required' },
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

    // Create tickets for all attendees
    const ticketIds: string[] = [];

    // Transactional creation (or simple loop with error bubbling)
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];

      const ticket = await prisma.ticket.create({
        data: {
          name: attendee.name,
          email: attendee.email || body.email || null,
          phone: attendee.phone || body.phone || null,
          eventId: body.eventId,
          status: 'pending',
          customAnswers: body.customAnswers || {},
        },
      });

      console.log(`Ticket ${i + 1}/${attendees.length} created in database:`, ticket.id);
      ticketIds.push(ticket.id);
    }

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
        include: { event: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // Return in-memory tickets if database not available
      tickets = ticketStorage.getAll();
      if (eventId) {
        tickets = tickets.filter(t => t.eventId === eventId);
      }
    }

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
