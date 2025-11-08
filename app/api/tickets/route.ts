import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPhonePePayment } from '@/lib/phonepe';
import { TicketFormData } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: TicketFormData = await req.json();
    
    // Validate required fields
    if (!body.name || !body.eventId) {
      return NextResponse.json(
        { error: 'Name and eventId are required' },
        { status: 400 }
      );
    }

    // Create pending ticket in database
    const ticket = await prisma.ticket.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        eventId: body.eventId,
        status: 'pending',
      },
    });

    // Create PhonePe Payment
    const payment = await createPhonePePayment({
      ticketId: ticket.id,
      amount: 20000, // ₹200 in paise
      name: body.name,
      email: body.email,
      phone: body.phone,
    });

    return NextResponse.json({
      ticketId: ticket.id,
      transactionId: payment.transactionId,
      paymentUrl: payment.paymentUrl,
    });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// GET /api/tickets/[id] - Get ticket details
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ticketId = url.pathname.split('/').pop();

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
