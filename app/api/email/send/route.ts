import { NextRequest, NextResponse } from 'next/server';
import { sendTicketEmail, TicketEmailData } from '@/lib/ticket-email';

export async function POST(request: NextRequest) {
  try {
    const body: TicketEmailData = await request.json();

    if (!body.to || !body.ticketId || !body.eventName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sendTicketEmail(body);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        messageId: (result as any).messageId,
      });
    } else {
      const errorMsg = (result as any).error || 'Failed to send email';
      console.error('Email sending failed:', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
