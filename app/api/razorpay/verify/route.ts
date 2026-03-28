import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';
import { enforceRateLimit } from '@/lib/rate-limit';
import Razorpay from 'razorpay';
import { calculateDynamicPrice } from '@/lib/pricing';

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
        const rateLimited = await enforceRateLimit(request, 'razorpay-verify', { requests: 20, window: '1 m' });
        if (rateLimited) return rateLimited;

        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, ticketId, emailStyles } = body;

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

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        if (!razorpayKeyId || !secret) {
            return NextResponse.json({ error: 'Payment verification not configured' }, { status: 500 });
        }

        const razorpay = new Razorpay({
            key_id: razorpayKeyId,
            key_secret: secret,
        });

        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (!payment || payment.order_id !== razorpay_order_id || !['authorized', 'captured'].includes(payment.status || '')) {
            return NextResponse.json({ error: 'Payment could not be verified with Razorpay' }, { status: 400 });
        }

        // Generate token for QR code
        const token = generateToken(ticketId);
        console.log('Generated token for ticket:', ticketId);

        // Try to update or create in database
        let amountPaid = 0;
        let ticketData = null;
        try {
            // First try to find the ticket
            const existingTicket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { Event: { include: { PricingRule: true } } },
            });

            if (existingTicket) {
                if (existingTicket.razorpayOrderId !== razorpay_order_id) {
                    return NextResponse.json({ error: 'Order does not match ticket' }, { status: 400 });
                }

                let expectedAmount = 0;
                if (existingTicket.Event.earlyBirdEnabled &&
                    existingTicket.Event.earlyBirdDeadline &&
                    new Date(existingTicket.Event.earlyBirdDeadline) > new Date(existingTicket.createdAt)) {
                    expectedAmount = existingTicket.Event.earlyBirdPrice || existingTicket.Event.price;
                } else {
                    expectedAmount = calculateDynamicPrice(existingTicket.Event as any);
                }

                if (Number(payment.amount || 0) < expectedAmount) {
                    return NextResponse.json({ error: 'Paid amount does not match ticket price' }, { status: 400 });
                }

                // Update existing ticket
                ticketData = await prisma.ticket.update({
                    where: { id: ticketId },
                    data: {
                        status: 'paid',
                        razorpayPaymentId: razorpay_payment_id,
                        razorpayOrderId: razorpay_order_id,
                        token: token,
                    },
                    include: { Event: true },
                });
                amountPaid = Number(payment.amount || 0);
                console.log('Ticket updated in database:', ticketId);
            } else {
                const memoryTicket = ticketStorage.get(ticketId);
                if (memoryTicket) {
                    if (memoryTicket.razorpayOrderId !== razorpay_order_id) {
                        return NextResponse.json({ error: 'Order does not match ticket' }, { status: 400 });
                    }

                    ticketData = await prisma.ticket.create({
                        data: {
                            id: ticketId,
                            name: memoryTicket.name || 'Guest',
                            email: memoryTicket.email,
                            phone: memoryTicket.phone || null,
                            Event: { connect: { id: memoryTicket.eventId } },
                            status: 'paid',
                            razorpayPaymentId: razorpay_payment_id,
                            razorpayOrderId: razorpay_order_id,
                            token: token,
                            updatedAt: new Date(),
                        },
                        include: { Event: true },
                    });
                    amountPaid = Number(payment.amount || 0);
                    console.log('Ticket created in database from memory:', ticketId);
                    ticketStorage.delete(ticketId);
                } else {
                    console.error('Ticket not found anywhere:', ticketId);
                    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
                }
            }
        } catch (e) {
            console.log('Database operation failed, updating in-memory storage:', e);
            const existingTicket = ticketStorage.get(ticketId);
            if (existingTicket) {
                if (existingTicket.razorpayOrderId !== razorpay_order_id) {
                    return NextResponse.json({ error: 'Order does not match ticket' }, { status: 400 });
                }
                ticketStorage.update(ticketId, {
                    status: 'paid',
                    razorpayPaymentId: razorpay_payment_id,
                    razorpayOrderId: razorpay_order_id,
                    token: token,
                });
                amountPaid = Number(payment.amount || 0);
                console.log('Ticket updated in memory:', ticketId);
            } else {
                console.warn('Ticket not found in memory storage:', ticketId);
                return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
            }
        }

        const recipientEmail = ticketData?.email || ticketStorage.get(ticketId)?.email;
        if (recipientEmail && ticketData?.Event) {
            try {
                const { sendTicketEmail } = await import('@/lib/ticket-email');

                console.log('Sending confirmation email to:', recipientEmail);
                const emailResult = await sendTicketEmail({
                    to: recipientEmail,
                    ticketId,
                    token, // Include token for QR code
                    eventName: ticketData.Event.name,
                    attendeeName: ticketData.name || 'Guest',
                    eventDate: ticketData.Event.date?.toISOString?.() || 'TBA',
                    venue: ticketData.Event.venue || 'TBA',
                    amountPaid,
                    transactionId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    paymentDate: new Date().toISOString(),
                    paymentMode: 'Online Payment',
                    emailStyles,
                });

                console.log('Email send result:', emailResult);
            } catch (emailError) {
                console.warn('Email sending failed:', emailError);
            }
        } else {
            console.log('No email available, skipping confirmation email');
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
