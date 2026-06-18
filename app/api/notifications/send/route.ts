import { NextRequest, NextResponse } from 'next/server';
import { sendTicketConfirmationSMS, isSMSConfigured } from '@/lib/sms';

export interface NotificationRequest {
    type: 'ticket_confirmation' | 'event_reminder';
    channels: ('sms' | 'email')[];
    data: {
        phone?: string;
        email?: string;
        attendeeName: string;
        eventName: string;
        eventDate: string;
        venue?: string;
        ticketId: string;
        ticketUrl?: string;
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: NotificationRequest = await request.json();
        const { type, channels, data } = body;

        if (!channels || channels.length === 0) {
            return NextResponse.json({ error: 'No notification channels specified' }, { status: 400 });
        }

        const results: { channel: string; success: boolean; messageId?: string; error?: string }[] = [];
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const ticketUrl = data.ticketUrl || `${baseUrl}/ticket/${data.ticketId}`;

        for (const channel of channels) {
            if (channel === 'sms' && data.phone) {
                const result = await sendTicketConfirmationSMS({
                    phone: data.phone,
                    attendeeName: data.attendeeName,
                    eventName: data.eventName,
                    eventDate: data.eventDate,
                    ticketId: data.ticketId,
                });
                results.push({
                    channel: 'sms',
                    success: result.success,
                    messageId: result.messageId,
                    error: result.error,
                });
            }

            if (channel === 'email') {
                results.push({
                    channel: 'email',
                    success: true,
                    error: 'Email should be sent via /api/email/send endpoint',
                });
            }
        }

        const allSuccessful = results.every(r => r.success);

        return NextResponse.json({
            success: allSuccessful,
            results,
            smsConfigured: isSMSConfigured(),
        });
    } catch (error: any) {
        console.error('Notification error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send notifications' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        smsConfigured: isSMSConfigured(),
        supportedChannels: ['sms', 'email'],
        smsProvider: 'Fast2SMS (India)',
    });
}
