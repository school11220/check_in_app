import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/rate-limit';
import Razorpay from 'razorpay';
import { allocatePaidAmount, calculateTicketUnitPrice } from '@/lib/pricing';

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

        const paidTotal = Number(payment.amount || 0);
        if (!Number.isFinite(paidTotal) || paidTotal <= 0) {
            return NextResponse.json({ error: 'Invalid paid amount' }, { status: 400 });
        }

        const orderTickets = await prisma.ticket.findMany({
            where: { razorpayOrderId: razorpay_order_id },
            include: { Event: { include: { PricingRule: true } } },
            orderBy: { createdAt: 'asc' },
        });

        if (orderTickets.length === 0) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (!orderTickets.some((ticket) => ticket.id === ticketId)) {
            return NextResponse.json({ error: 'Order does not match ticket' }, { status: 400 });
        }

        const eventId = orderTickets[0].eventId;
        if (orderTickets.some((ticket) => ticket.eventId !== eventId)) {
            return NextResponse.json({ error: 'Order contains tickets from multiple events' }, { status: 400 });
        }

        const invalidTicket = orderTickets.find((ticket) => !['pending', 'paid'].includes(ticket.status));
        if (invalidTicket) {
            return NextResponse.json({ error: 'Order contains a ticket that cannot be marked as paid' }, { status: 400 });
        }

        const newlyPaidTickets = orderTickets.filter((ticket) => ticket.status !== 'paid');
        const primaryToken = generateToken(ticketId);

        const updatedTickets = await prisma.$transaction(async (tx) => {
            const updated = [];
            const estimatedSubtotal = orderTickets.reduce((sum, ticket) => (
                sum + calculateTicketUnitPrice(ticket.Event as any, ticket.createdAt)
            ), 0);
            const totalDiscount = Math.max(0, estimatedSubtotal - paidTotal);

            for (let index = 0; index < orderTickets.length; index++) {
                const ticket = orderTickets[index];
                updated.push(await tx.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        status: 'paid',
                        razorpayPaymentId: razorpay_payment_id,
                        razorpayOrderId: razorpay_order_id,
                        amountPaid: allocatePaidAmount(paidTotal, orderTickets.length, index),
                        token: generateToken(ticket.id),
                    },
                    include: { Event: true },
                }));
            }

            if (newlyPaidTickets.length > 0) {
                await tx.event.update({
                    where: { id: eventId },
                    data: { soldCount: { increment: newlyPaidTickets.length } },
                });

                const promoGroups = newlyPaidTickets.reduce<Record<string, typeof newlyPaidTickets>>((groups, ticket) => {
                    if (!ticket.promoCodeId) return groups;
                    groups[ticket.promoCodeId] = [...(groups[ticket.promoCodeId] || []), ticket];
                    return groups;
                }, {});

                for (const [promoCode, tickets] of Object.entries(promoGroups)) {
                    await tx.promoCodeRecord.updateMany({
                        where: { code: promoCode },
                        data: { usedCount: { increment: tickets.length } },
                    });

                    await tx.promoUsage.createMany({
                        data: tickets.map((ticket, index) => ({
                            promoCode,
                            ticketId: ticket.id,
                            userId: ticket.email || ticket.userId || null,
                            eventId: ticket.eventId,
                            discount: allocatePaidAmount(totalDiscount, newlyPaidTickets.length, index),
                        })),
                    });
                }
            }

            return updated;
        });

        const ticketData = updatedTickets.find((ticket) => ticket.id === ticketId) || updatedTickets[0];
        const amountPaid = ticketData.amountPaid || allocatePaidAmount(paidTotal, orderTickets.length, 0);

        const recipientEmail = ticketData?.email;
        if (recipientEmail && ticketData?.Event) {
            try {
                const { sendTicketEmail } = await import('@/lib/ticket-email');

                console.log('Sending confirmation email to:', recipientEmail);
                const emailResult = await sendTicketEmail({
                    to: recipientEmail,
                    ticketId,
                    token: primaryToken,
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
