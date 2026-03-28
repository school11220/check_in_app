import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { prisma } from '@/lib/prisma';
import { calculateDynamicPrice } from '@/lib/pricing';
import { enforceRateLimit } from '@/lib/rate-limit';

// In-memory ticket storage
const ticketOrders: Map<string, { ticketId: string; orderId: string; ticketIds?: string[] }> = new Map();

// Validate Razorpay credentials on startup
// Validate Razorpay credentials on startup
const ENV_RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const ENV_RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function getRazorpayInstance(keyId?: string, keySecret?: string) {
    const finalKeyId = keyId || ENV_RAZORPAY_KEY_ID;
    const finalKeySecret = keySecret || ENV_RAZORPAY_KEY_SECRET;

    if (!finalKeyId || !finalKeySecret) {
        throw new Error('Razorpay credentials not found');
    }
    return new Razorpay({
        key_id: finalKeyId,
        key_secret: finalKeySecret,
    });
}

// Create a Razorpay order
export async function POST(request: NextRequest) {
    try {
        const rateLimited = await enforceRateLimit(request, 'razorpay-order', { requests: 10, window: '1 m' });
        if (rateLimited) return rateLimited;

        const body = await request.json();
        const { ticketId, ticketIds, quantity } = body;

        const requestedTicketIds = Array.isArray(ticketIds) && ticketIds.length > 0 ? ticketIds : [ticketId];
        if (!requestedTicketIds[0]) {
            return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
        }

        // Check Global Sales Pause
        const siteConfig = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
        const settings = siteConfig?.settings as any;
        if (settings?.globalSalesPaused) {
            return NextResponse.json(
                { error: 'Ticket sales are currently paused globally.' },
                { status: 403 }
            );
        }

        console.log('Razorpay order request:', { ticketId, ticketIds: requestedTicketIds, quantity });

        const tickets = await prisma.ticket.findMany({
            where: { id: { in: requestedTicketIds } },
            include: { Event: { include: { PricingRule: true } } },
        });

        if (tickets.length !== requestedTicketIds.length) {
            return NextResponse.json({ error: 'One or more tickets were not found' }, { status: 404 });
        }

        const primaryTicket = tickets[0];
        if (!primaryTicket?.Event) {
            return NextResponse.json({ error: 'Event not found for ticket' }, { status: 404 });
        }

        const eventId = primaryTicket.eventId;
        const invalidTicket = tickets.find((ticket) => ticket.eventId !== eventId);
        if (invalidTicket) {
            return NextResponse.json({ error: 'All tickets in an order must belong to the same event' }, { status: 400 });
        }

        const nonPendingTicket = tickets.find((ticket) => ticket.status !== 'pending');
        if (nonPendingTicket) {
            return NextResponse.json({ error: 'Only pending tickets can be paid' }, { status: 400 });
        }

        if (!primaryTicket.Event.isActive) {
            return NextResponse.json(
                { error: 'Ticket sales are paused for this event.' },
                { status: 403 }
            );
        }

        let eventPrice = 0;
        if (primaryTicket.Event.earlyBirdEnabled &&
            primaryTicket.Event.earlyBirdDeadline &&
            new Date(primaryTicket.Event.earlyBirdDeadline) > new Date()) {
            eventPrice = primaryTicket.Event.earlyBirdPrice || primaryTicket.Event.price;
        } else {
            eventPrice = calculateDynamicPrice(primaryTicket.Event as any);
        }

        const ticketCount = requestedTicketIds.length;
        const requestedQuantity = quantity ? Number(quantity) : ticketCount;
        if (requestedQuantity !== ticketCount) {
            return NextResponse.json({ error: 'Ticket quantity mismatch' }, { status: 400 });
        }

        const orderAmount = eventPrice * ticketCount;
        if (orderAmount <= 0) {
            return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
        }

        console.log('Creating Razorpay order with amount:', orderAmount);

        // Fetch Dynamic Config
        const razorpayKeyId = ENV_RAZORPAY_KEY_ID;

        // Create Razorpay order with the correct total amount
        // We use env vars directly now, removing the db-switch logic
        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create({
            amount: orderAmount,
            currency: 'INR',
            receipt: primaryTicket.id,
            notes: {
                ticketId: primaryTicket.id,
                ticketIds: requestedTicketIds.join(','),
                quantity: ticketCount,
                eventId,
            },
        });

        // Store order mapping with all ticket IDs
        ticketOrders.set(primaryTicket.id, {
            ticketId: primaryTicket.id,
            orderId: order.id,
            ticketIds: requestedTicketIds,
        });

        await prisma.ticket.updateMany({
            where: { id: { in: requestedTicketIds } },
            data: { razorpayOrderId: order.id },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || razorpayKeyId,
            quantity: ticketCount,
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
