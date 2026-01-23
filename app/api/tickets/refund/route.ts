import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId, reason, refundAmount } = body;

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
        }

        let ticket = null;
        let event = null;

        // Try database first
        try {
            ticket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { Event: true },
            });
            event = ticket?.Event;
        } catch (e) {
            console.log('Database not available, checking memory storage');
            ticket = ticketStorage.get(ticketId);
        }

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (ticket.status === 'refunded') {
            return NextResponse.json({ error: 'Ticket already refunded' }, { status: 400 });
        }

        if (ticket.status !== 'paid') {
            return NextResponse.json({ error: 'Only paid tickets can be refunded' }, { status: 400 });
        }

        // Update ticket status
        try {
            await prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    status: 'refunded',
                    // Store refund info in a note or separate table in production
                },
            });
        } catch (e) {
            // Update in memory
            ticketStorage.update(ticketId, { status: 'refunded' });
        }

        // In production, you would also:
        // 1. Process refund via Razorpay API
        // 2. Send refund confirmation email
        // 3. Update event sold count

        const eventPrice = event?.price || 0;
        const actualRefund = refundAmount || eventPrice;

        return NextResponse.json({
            success: true,
            ticketId,
            refundAmount: actualRefund,
            message: 'Ticket refunded successfully',
            note: 'In production, Razorpay refund API would be called here',
        });
    } catch (error: any) {
        console.error('Refund error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process refund' },
            { status: 500 }
        );
    }
}
