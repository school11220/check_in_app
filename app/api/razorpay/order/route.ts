import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/prisma';

// Fallback events data
const FALLBACK_EVENTS: Record<string, { name: string; price: number }> = {
    'event-1': { name: 'Tech Conference 2025', price: 50000 },
    'event-2': { name: 'Music Festival Night', price: 200000 },
    'event-3': { name: 'Startup Meetup', price: 20000 },
    'event-4': { name: 'Art Exhibition Opening', price: 30000 },
};

// In-memory ticket storage
const ticketOrders: Map<string, { ticketId: string; orderId: string; ticketIds?: string[] }> = new Map();

// Validate Razorpay credentials on startup
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function getRazorpayInstance() {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
    }
    return new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
}

// Create a Razorpay order
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId, ticketIds, amount, quantity } = body;

        console.log('Razorpay order request:', { ticketId, ticketIds, amount, quantity });

        // Use the amount passed from frontend if available (for multi-ticket support)
        let orderAmount = amount;
        let eventName = 'Event Ticket';

        // If no amount passed, calculate from ticket/event
        if (!orderAmount) {
            let ticket: any = null;
            let eventPrice = 30000; // Default ₹300

            try {
                ticket = await prisma.ticket.findUnique({
                    where: { id: ticketId },
                    include: { event: true },
                });

                if (ticket?.event) {
                    eventPrice = ticket.event.price;
                    eventName = ticket.event.name;
                }
            } catch (e) {
                console.log('Database not available, using fallback');
            }

            // Calculate total amount
            const ticketCount = quantity || ticketIds?.length || 1;
            orderAmount = eventPrice * ticketCount;
        }

        console.log('Creating Razorpay order with amount:', orderAmount);

        // Create Razorpay order with the correct total amount
        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create({
            amount: orderAmount,
            currency: 'INR',
            receipt: ticketId,
            notes: {
                ticketId: ticketId,
                ticketIds: ticketIds ? ticketIds.join(',') : ticketId,
                quantity: quantity || 1,
            },
        });

        // Store order mapping with all ticket IDs
        ticketOrders.set(ticketId, {
            ticketId,
            orderId: order.id,
            ticketIds: ticketIds || [ticketId],
        });

        // Try to update tickets in database
        const allTicketIds = ticketIds || [ticketId];
        for (const tId of allTicketIds) {
            try {
                await prisma.ticket.update({
                    where: { id: tId },
                    data: { razorpayOrderId: order.id },
                });
            } catch (e) {
                // Ignore if database not available
            }
        }

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || RAZORPAY_KEY_ID,
            quantity: quantity || 1,
        });
    } catch (error) {
        console.error('Razorpay order creation failed:', error);
        return NextResponse.json(
            { error: 'Failed to create payment order' },
            { status: 500 }
        );
    }
}

export { ticketOrders };
