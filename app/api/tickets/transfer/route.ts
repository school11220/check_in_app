import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeTicketAccess } from '@/lib/ticket-access';
import { generateTransferToken } from '@/lib/ticket-security';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId, token, newOwnerName, newOwnerEmail, newOwnerPhone } = body;

        if (!ticketId || !newOwnerName || !newOwnerEmail) {
            return NextResponse.json(
                { error: 'Ticket ID, new owner name, and email are required' },
                { status: 400 }
            );
        }

        const rateLimited = await enforceRateLimit(request, 'ticket-transfer', { requests: 5, window: '1 m' }, ticketId);
        if (rateLimited) return rateLimited;

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { Event: true },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (ticket.status !== 'paid') {
            return NextResponse.json({ error: 'Only paid tickets can be transferred' }, { status: 400 });
        }

        if (ticket.checkedIn) {
            return NextResponse.json({ error: 'Cannot transfer a checked-in ticket' }, { status: 400 });
        }

        const access = await authorizeTicketAccess(ticket, token);
        if (!access.allowed) {
            return NextResponse.json({ error: 'Ticket token or authorized session required' }, { status: 401 });
        }

        // Generate new token for security
        const newToken = generateTransferToken(ticketId);

        // Update ticket with new owner
        await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                name: newOwnerName,
                email: newOwnerEmail,
                phone: newOwnerPhone || null,
                token: newToken,
            },
        });

        // In production, send confirmation emails to both old and new owner

        return NextResponse.json({
            success: true,
            ticketId,
            token: newToken,
            newOwner: {
                name: newOwnerName,
                email: newOwnerEmail,
            },
            message: 'Ticket transferred successfully',
        });
    } catch (error: any) {
        console.error('Transfer error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to transfer ticket' },
            { status: 500 }
        );
    }
}
