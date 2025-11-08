import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyChecksum, checkPaymentStatus } from '@/lib/phonepe';
import { generateTicketToken } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    // Get the callback data
    const body = await req.json();
    
    // Check if this is a mock payment (for testing)
    if (body.transactionId && body.status) {
      const transactionId = body.transactionId;
      const paymentStatus = body.status;

      console.log('📱 Mock payment callback:', { transactionId, paymentStatus });

      if (paymentStatus === 'SUCCESS') {
        try {
          // Generate secure token
          const token = generateTicketToken(transactionId);

          // Update ticket to paid status with token
          await prisma.ticket.update({
            where: { id: transactionId },
            data: {
              status: 'paid',
              token: token,
            },
          });

          console.log(`✅ Ticket ${transactionId} marked as paid with token`);

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
        console.log(`❌ Payment failed for ticket ${transactionId}`);
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

    console.log('PhonePe callback received:', decodedResponse);

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
        // Generate secure token
        const token = generateTicketToken(transactionId);

        // Update ticket to paid status with token
        await prisma.ticket.update({
          where: { id: transactionId },
          data: {
            status: 'paid',
            token: token,
          },
        });

        console.log(`✅ Ticket ${transactionId} marked as paid with token`);

        // Redirect user to ticket page
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${transactionId}?success=true`
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
        `${process.env.NEXT_PUBLIC_APP_URL}/ticket/${transactionId}?pending=true`
      );
    } else {
      // Payment failed
      console.log(`❌ Payment failed for ticket ${transactionId}`);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?payment_failed=true`
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
