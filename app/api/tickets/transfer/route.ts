import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EVENT_SELECT } from '@/lib/event-select';
import { authorizeTicketAccess } from '@/lib/ticket-access';
import { generateTransferToken } from '@/lib/ticket-security';
import { enforceRateLimit } from '@/lib/rate-limit';
import { isPaidLikeStatus } from '@/lib/ticket-lifecycle';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId, token, newOwnerName, newOwnerEmail, newOwnerPhone } = body;

        if (!ticketId || typeof ticketId !== 'string' || !newOwnerName || typeof newOwnerName !== 'string' || newOwnerName.length > 200 || !newOwnerEmail || typeof newOwnerEmail !== 'string' || newOwnerEmail.length > 254) {
            return NextResponse.json(
                { error: 'Ticket ID, new owner name, and email are required' },
                { status: 400 }
            );
        }

        const rateLimited = await enforceRateLimit(request, 'ticket-transfer', { requests: 3, window: '1 m' }, ticketId);
        if (rateLimited) return rateLimited;

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { Event: { select: EVENT_SELECT } },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (!isPaidLikeStatus(ticket.status)) {
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

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newOwnerEmail)) {
            return NextResponse.json({ error: 'Invalid new owner email' }, { status: 400 });
        }

        // The token condition makes concurrent transfers mutually exclusive.
        const updateResult = await prisma.ticket.updateMany({
            where: { id: ticketId, token: ticket.token, checkedIn: false, status: { in: ['paid', 'partially_refunded'] } },
            data: {
                name: newOwnerName.trim(),
                email: newOwnerEmail.trim().toLowerCase(),
                phone: typeof newOwnerPhone === 'string' && newOwnerPhone.trim() ? newOwnerPhone.trim() : null,
                token: newToken,
            },
        });
        if (updateResult.count !== 1) {
            return NextResponse.json({ error: 'Ticket was changed by another request. Please refresh and try again.' }, { status: 409 });
        }

        try {
            await prisma.auditLog.create({
                data: {
                    id: `transfer-${ticketId}-${Date.now()}`,
                    action: 'TRANSFER',
                    resource: 'ticket',
                    resourceId: ticketId,
                    details: { oldEmail: ticket.email, newEmail: newOwnerEmail.trim().toLowerCase() },
                    userId: access.session?.user.id || 'ticket-holder',
                    userName: access.session?.user.name || access.session?.user.email || 'ticket-holder',
                    userRole: access.session?.user.role || 'TICKET_HOLDER',
                },
            });
        } catch (auditError) {
            console.error('Transfer audit log failed:', auditError);
        }

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
    } catch (error) {
        console.error('Transfer error:', error);
        return NextResponse.json({ error: 'Failed to transfer ticket' }, { status: 500 });
    }
}
