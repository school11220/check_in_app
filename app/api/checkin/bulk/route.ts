import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';
import { auth } from '@clerk/nextjs/server';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        const rateLimited = await enforceRateLimit(request, 'checkin-bulk', { requests: 20, window: '1 m' }, userId || undefined);
        if (rateLimited) return rateLimited;

        const body = await request.json();
        const { ticketIds } = body;

        if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
            return NextResponse.json({ error: 'Ticket IDs array is required' }, { status: 400 });
        }

        const results: { ticketId: string; success: boolean; error?: string; name?: string }[] = [];
        const checkedInAt = new Date();

        for (const ticketId of ticketIds) {
            try {
                let ticket = null;

                // Try database first
                try {
                    ticket = await prisma.ticket.findUnique({
                        where: { id: ticketId },
                    });
                } catch (e) {
                    ticket = ticketStorage.get(ticketId);
                }

                if (!ticket) {
                    results.push({ ticketId, success: false, error: 'Ticket not found' });
                    continue;
                }

                if (ticket.status !== 'paid') {
                    results.push({ ticketId, success: false, error: 'Ticket not paid' });
                    continue;
                }

                if (ticket.checkedIn) {
                    results.push({ ticketId, success: false, error: 'Already checked in', name: ticket.name });
                    continue;
                }

                // Update ticket
                try {
                    await prisma.ticket.update({
                        where: { id: ticketId },
                        data: {
                            checkedIn: true,
                            checkedInAt,
                        },
                    });
                } catch (e) {
                    ticketStorage.update(ticketId, { checkedIn: true, checkedInAt });
                }

                results.push({ ticketId, success: true, name: ticket.name });
            } catch (err: any) {
                results.push({ ticketId, success: false, error: err.message });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            totalProcessed: ticketIds.length,
            successful,
            failed,
            results,
        });
    } catch (error: any) {
        console.error('Bulk check-in error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process bulk check-in' },
            { status: 500 }
        );
    }
}
