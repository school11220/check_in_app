import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';

// Fallback events data for getting price when DB not available
const FALLBACK_EVENTS: Record<string, { name: string; price: number }> = {
    'event-1': { name: 'Tech Conference 2025', price: 50000 },
    'event-2': { name: 'Music Festival Night', price: 200000 },
    'event-3': { name: 'Startup Meetup', price: 20000 },
    'event-4': { name: 'Art Exhibition Opening', price: 30000 },
};

function generateToken(ticketId: string): string {
    const secret = process.env.TICKET_SECRET_KEY || 'default-secret-key-for-demo';
    return crypto
        .createHmac('sha256', secret)
        .update(ticketId)
        .digest('hex');
}

// Verify Razorpay payment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, ticketId, email, name, eventName, eventDate, venue, emailStyles } = body;

        console.log('Verifying payment for ticket:', ticketId);

        // Verify signature
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            console.error('RAZORPAY_KEY_SECRET not configured');
            return NextResponse.json({ error: 'Payment verification not configured' }, { status: 500 });
        }
        const text = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(text)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('Invalid payment signature');
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
        }

        // Generate token for QR code
        const token = generateToken(ticketId);
        console.log('Generated token for ticket:', ticketId);

        // Try to update in database
        let amountPaid = 0;
        try {
            const updatedTicket = await prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    status: 'paid',
                    razorpayPaymentId: razorpay_payment_id,
                    razorpayOrderId: razorpay_order_id,
                    token: token,
                },
                include: { event: true },
            });
            amountPaid = updatedTicket.event?.price || 0;
            console.log('Ticket updated in database:', ticketId);
        } catch (e) {
            console.log('Database not available, updating in-memory storage');
            // Update in shared memory storage
            const existingTicket = ticketStorage.get(ticketId);
            if (existingTicket) {
                ticketStorage.update(ticketId, {
                    status: 'paid',
                    razorpayPaymentId: razorpay_payment_id,
                    razorpayOrderId: razorpay_order_id,
                    token: token,
                });
                // Get price from fallback events
                amountPaid = FALLBACK_EVENTS[existingTicket.eventId]?.price || 0;
                console.log('Ticket updated in memory:', ticketId);
            } else {
                console.warn('Ticket not found in memory storage:', ticketId);
            }
        }

        // Send confirmation email with PDF ticket
        if (email) {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

                console.log('Sending confirmation email to:', email);
                const emailResponse = await fetch(`${baseUrl}/api/email/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: email,
                        ticketId,
                        token, // Include token for QR code
                        eventName: eventName || 'Event',
                        attendeeName: name || 'Guest',
                        eventDate: eventDate || 'TBA',
                        venue: venue || 'TBA',
                        // Payment details
                        amountPaid,
                        transactionId: razorpay_payment_id,
                        orderId: razorpay_order_id,
                        paymentDate: new Date().toISOString(),
                        paymentMode: 'Online Payment',
                        emailStyles,
                    }),
                });

                const emailResult = await emailResponse.json();
                console.log('Email send result:', emailResult);
            } catch (emailError) {
                console.warn('Email sending failed:', emailError);
                // Don't fail the payment if email fails
            }
        } else {
            console.log('No email provided, skipping confirmation email');
        }

        return NextResponse.json({
            success: true,
            ticketId: ticketId,
            message: 'Payment verified successfully',
        });
    } catch (error) {
        console.error('Payment verification failed:', error);
        return NextResponse.json(
            { error: 'Payment verification failed' },
            { status: 500 }
        );
    }
}
