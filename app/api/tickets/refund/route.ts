import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import { fireWebhook } from '@/lib/webhooks';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!hasRole(session.user.role, ORGANIZER_ROLES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const rateLimited = await enforceRateLimit(request, 'ticket-refund', { requests: 10, window: '1 m' }, session.user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { ticketId, reason, refundAmount, refundType = 'full' } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { Event: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!hasEventAccess(session, ticket.eventId)) {
      return NextResponse.json({ error: 'You do not have access to this event' }, { status: 403 });
    }

    if (ticket.status === 'refunded') {
      return NextResponse.json({ error: 'Ticket already refunded' }, { status: 400 });
    }

    if (ticket.status !== 'paid') {
      return NextResponse.json({ error: 'Only paid tickets can be refunded' }, { status: 400 });
    }

    const paidAmount = ticket.amountPaid || ticket.Event.price || 0;
    const requestedRefund = refundType === 'partial' && refundAmount ? Number(refundAmount) : paidAmount;
    const actualRefund = Math.min(Math.max(0, requestedRefund), paidAmount);
    if (actualRefund <= 0) {
      return NextResponse.json({ error: 'Refund amount must be greater than zero' }, { status: 400 });
    }

    // Try Razorpay refund if payment ID exists
    let razorpayRefund = null;
    if (ticket.razorpayPaymentId && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const refundRes = await fetch(
          `https://api.razorpay.com/v1/payments/${ticket.razorpayPaymentId}/refund`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: actualRefund, // amount in paise
              notes: { reason: reason || 'Refund requested', ticketId, refundedBy: session.user.id },
            }),
          }
        );
        const refundData = await refundRes.json();
        if (refundData.id) {
          razorpayRefund = { id: refundData.id, status: refundData.status, amount: refundData.amount };
        } else {
          console.error('Razorpay refund failed:', refundData);
        }
      } catch (e) {
        console.error('Razorpay refund error:', e);
      }
    }

    const fullRefund = actualRefund >= paidAmount;
    const transactionOps: any[] = [
      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: fullRefund ? 'refunded' : 'paid',
          amountPaid: fullRefund ? paidAmount : paidAmount - actualRefund,
        },
        include: { Event: true },
      }),
    ];

    if (fullRefund) {
      transactionOps.push(prisma.event.updateMany({
        where: { id: ticket.eventId, soldCount: { gt: 0 } },
        data: { soldCount: { decrement: 1 } },
      }));
    }

    transactionOps.push(prisma.auditLog.create({
        data: {
          id: `refund-${ticketId}-${Date.now()}`,
          action: 'REFUND',
          resource: 'ticket',
          resourceId: ticketId,
          details: {
            reason,
            refundType,
            amount: actualRefund,
            razorpayRefundId: razorpayRefund?.id || null,
            originalPaymentId: ticket.razorpayPaymentId,
            attendeeName: ticket.name,
            attendeeEmail: ticket.email,
          },
          userId: session.user.id,
          userName: session.user.name || session.user.email,
          userRole: session.user.role,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      }));

    const [updatedTicket] = await prisma.$transaction(transactionOps);

    // Send refund confirmation email
    if (ticket.email && isEmailConfigured()) {
      try {
        const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(actualRefund / 100);
        await sendEmail({
          to: ticket.email,
          toName: ticket.name,
          subject: `Refund Processed - ${ticket.Event.name}`,
          htmlContent: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#000;font-family:Inter,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#111;border-radius:16px;border:1px solid #333;">
<tr><td style="background:#dc2626;padding:24px;text-align:center;border-radius:16px 16px 0 0;">
<h1 style="color:#fff;margin:0;font-size:20px;">Refund Processed</h1></td></tr>
<tr><td style="padding:30px;color:#fff;">
<p>Hi ${ticket.name},</p>
<p>Your refund for <strong>${ticket.Event.name}</strong> has been processed.</p>
<div style="background:#1a1a1a;padding:20px;border-radius:8px;margin:20px 0;">
<p style="margin:4px 0;color:#888;">Amount Refunded</p>
<p style="margin:0;font-size:24px;font-weight:bold;color:#22c55e;">${formattedAmount}</p>
${reason ? `<p style="margin:12px 0 0;color:#888;">Reason: ${reason}</p>` : ''}
${razorpayRefund ? `<p style="margin:8px 0 0;color:#888;">Refund ID: ${razorpayRefund.id}</p>` : ''}
</div>
<p style="color:#888;font-size:13px;">The refund will reflect in your account within 5-7 business days.</p>
</td></tr></table></td></tr></table></body></html>`,
        });
      } catch (e) {
        console.error('Refund email failed:', e);
      }
    }

    // Fire webhook (non-blocking)
    fireWebhook('ticket.refunded', {
      ticketId, attendeeName: ticket.name, attendeeEmail: ticket.email,
      eventId: ticket.eventId, eventName: ticket.Event.name,
      refundAmount: actualRefund, refundType, razorpayRefundId: razorpayRefund?.id,
      refundedBy: session.user.id,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      ticketId,
      refundAmount: actualRefund,
      refundType,
      razorpayRefund,
      message: 'Ticket refunded successfully',
    });
  } catch (error: any) {
    console.error('Refund error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process refund' }, { status: 500 });
  }
}
