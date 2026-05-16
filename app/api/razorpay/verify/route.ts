import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/rate-limit';
import Razorpay from 'razorpay';
import { allocatePaidAmount, calculateTicketUnitPrice } from '@/lib/pricing';
import { generateTicketToken, timingSafeStringEqual } from '@/lib/ticket-security';
import { isPaidLikeStatus } from '@/lib/ticket-lifecycle';
import { logSecurityEvent } from '@/lib/security-events';

// Verify Razorpay payment
export async function POST(request: NextRequest) {
    try {
        const rateLimited = await enforceRateLimit(request, 'razorpay-verify', { requests: 10, window: '1 m' });
        if (rateLimited) return rateLimited;

        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, ticketId, emailStyles } = body;

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

        if (!timingSafeStringEqual(expectedSignature, razorpay_signature)) {
            console.error('Invalid payment signature');
            await logSecurityEvent(request, {
                type: 'payment_failed',
                key: `razorpay:${razorpay_order_id || 'missing-order'}`,
                ticketId: ticketId || null,
                details: { reason: 'invalid_signature', razorpay_order_id, razorpay_payment_id },
            });
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
            await logSecurityEvent(request, {
                type: 'payment_failed',
                key: `razorpay:${razorpay_order_id || 'missing-order'}`,
                ticketId: ticketId || null,
                details: { reason: 'gateway_status_mismatch', status: payment?.status, payment_order_id: payment?.order_id },
            });
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

        const invalidTicket = orderTickets.find((ticket) => !['pending', 'paid', 'partially_refunded'].includes(ticket.status));
        if (invalidTicket) {
            return NextResponse.json({ error: 'Order contains a ticket that cannot be marked as paid' }, { status: 400 });
        }

        const newlyPaidTickets = orderTickets.filter((ticket) => !['paid', 'partially_refunded'].includes(ticket.status));

        const updatedTickets = await prisma.$transaction(async (tx) => {
            const updated = [];
            const estimatedSubtotal = orderTickets.reduce((sum, ticket) => (
                sum + calculateTicketUnitPrice(ticket.Event as any, ticket.createdAt)
            ), 0);
            const totalDiscount = Math.max(0, estimatedSubtotal - paidTotal);

            for (let index = 0; index < orderTickets.length; index++) {
                const ticket = orderTickets[index];
                if (isPaidLikeStatus(ticket.status)) {
                    updated.push(await tx.ticket.update({
                        where: { id: ticket.id },
                        data: {
                            razorpayPaymentId: ticket.razorpayPaymentId || razorpay_payment_id,
                            razorpayOrderId: ticket.razorpayOrderId || razorpay_order_id,
                            paymentMethod: ticket.paymentMethod || 'razorpay',
                            token: ticket.token || generateTicketToken(ticket.id),
                        },
                        include: { Event: true },
                    }));
                    continue;
                }

                const grossAmount = calculateTicketUnitPrice(ticket.Event as any, ticket.createdAt);
                const discountAmount = allocatePaidAmount(totalDiscount, orderTickets.length, index);
                updated.push(await tx.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        status: 'paid',
                        razorpayPaymentId: razorpay_payment_id,
                        razorpayOrderId: razorpay_order_id,
                        amountPaid: allocatePaidAmount(paidTotal, orderTickets.length, index),
                        grossAmount,
                        discountAmount,
                        refundedAmount: 0,
                        paymentMethod: 'razorpay',
                        token: ticket.token || generateTicketToken(ticket.id),
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
        const primaryToken = ticketData.token || generateTicketToken(ticketId);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const ticketUrl = `${baseUrl}/ticket/${ticketId}?success=true&token=${encodeURIComponent(primaryToken)}`;

        const recipientEmail = ticketData?.email;
        if (newlyPaidTickets.length > 0 && recipientEmail && ticketData?.Event) {
            try {
                const { sendTicketEmail } = await import('@/lib/ticket-email');

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

                if (!emailResult.success) {
                    const emailError = 'error' in emailResult ? emailResult.error : 'message' in emailResult ? emailResult.message : 'Unknown email error';
                    console.warn('Ticket email was not sent:', emailError);
                }
            } catch (emailError) {
                console.warn('Email sending failed:', emailError);
            }
        } else {
            console.warn('Skipping confirmation email because no new paid ticket or recipient email was available');
        }

        return NextResponse.json({
            success: true,
            ticketId: ticketId,
            token: primaryToken,
            ticketUrl,
            alreadyVerified: newlyPaidTickets.length === 0,
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
