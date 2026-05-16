import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyChecksum, checkPaymentStatus } from '@/lib/phonepe';
import { generateTicketToken } from '@/lib/ticket-security';

async function markPhonePeTicketPaid(transactionId: string, amountPaid?: number | null) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: transactionId },
    include: { Event: true },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }
  if (!['pending', 'paid'].includes(ticket.status)) {
    throw new Error('Ticket cannot be marked as paid');
  }

  const token = ticket.token || generateTicketToken(transactionId);
  const finalAmountPaid = amountPaid || ticket.amountPaid || ticket.Event.price || 0;
  const operations = [
    prisma.ticket.update({
      where: { id: transactionId },
      data: {
        status: 'paid',
        token,
        amountPaid: finalAmountPaid,
      },
    }),
  ];

  if (ticket.status !== 'paid') {
    operations.push(prisma.event.update({
      where: { id: ticket.eventId },
      data: { soldCount: { increment: 1 } },
    }) as any);
  }

  await prisma.$transaction(operations as any);
  return { ticket, token };
}

export async function POST(req: NextRequest) {
  try {
    // Get the callback data
    const body = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Mock callbacks are only allowed during explicit local testing.
    if (body.transactionId && body.status && process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_PAYMENTS === 'true') {
      const transactionId = body.transactionId;
      const paymentStatus = body.status;

      if (paymentStatus === 'SUCCESS') {
        try {
          await markPhonePeTicketPaid(transactionId, Number(body.amount || 0) || null);

          return NextResponse.json({
            success: true,
            message: 'Payment successful',
          });
        } catch (error) {
          console.error('Error updating ticket:', error);
          return NextResponse.json(
            { error: 'Failed to update ticket' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, message: 'Payment failed' },
          { status: 400 }
        );
      }
    }
    
    // Real PhonePe callback handling (for production)
    const base64Response = body.response;
    const checksum = req.headers.get('X-VERIFY') || '';
    
    // Verify checksum
    if (!verifyChecksum(checksum, base64Response)) {
      console.error('Invalid checksum in PhonePe callback');
      return NextResponse.json(
        { error: 'Invalid checksum' },
        { status: 400 }
      );
    }

    // Decode the response
    const decodedResponse = JSON.parse(
      Buffer.from(base64Response, 'base64').toString('utf-8')
    );

    const transactionId = decodedResponse.data?.merchantTransactionId;
    const paymentStatus = decodedResponse.code;

    if (!transactionId) {
      console.error('No transaction ID in callback');
      return NextResponse.json(
        { error: 'Invalid callback data' },
        { status: 400 }
      );
    }

    // Check if payment was successful
    if (paymentStatus === 'PAYMENT_SUCCESS') {
      try {
        const amountPaid = Number(decodedResponse.data?.amount || 0) || null;
        const { token } = await markPhonePeTicketPaid(transactionId, amountPaid);

        // Redirect user to ticket page
        return NextResponse.redirect(
          `${baseUrl}/ticket/${transactionId}?success=true&token=${encodeURIComponent(token)}`
        );
      } catch (error) {
        console.error('Error updating ticket:', error);
        return NextResponse.json(
          { error: 'Failed to update ticket' },
          { status: 500 }
        );
      }
    } else if (paymentStatus === 'PAYMENT_PENDING') {
      // Payment is still processing
      return NextResponse.redirect(
        `${baseUrl}/ticket/${transactionId}?pending=true`
      );
    } else {
      // Payment failed
      return NextResponse.redirect(
        `${baseUrl}/?payment_failed=true`
      );
    }
  } catch (error: any) {
    console.error('PhonePe callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Callback processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for status checks)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    const status = await checkPaymentStatus(transactionId);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
