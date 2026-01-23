import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketStorage } from '@/lib/ticket-storage';
import crypto from 'crypto';

function generateToken(ticketId: string): string {
    const secret = process.env.TICKET_SECRET_KEY || 'default-secret-key-for-demo';
    return crypto.createHmac('sha256', secret).update(ticketId).digest('hex');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticketId, newOwnerName, newOwnerEmail, newOwnerPhone } = body;

        if (!ticketId || !newOwnerName || !newOwnerEmail) {
            return NextResponse.json(
                { error: 'Ticket ID, new owner name, and email are required' },
                { status: 400 }
            );
        }

        let ticket = null;

        // Try database first
        try {
            ticket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { Event: true },
            });
        } catch (e) {
            console.log('Database not available, checking memory storage');
            ticket = ticketStorage.get(ticketId);
        }

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (ticket.status !== 'paid') {
            return NextResponse.json({ error: 'Only paid tickets can be transferred' }, { status: 400 });
        }

        if (ticket.checkedIn) {
            return NextResponse.json({ error: 'Cannot transfer a checked-in ticket' }, { status: 400 });
        }

        // Generate new token for security
        const newToken = generateToken(ticketId + Date.now());

        // Update ticket with new owner
        try {
            await prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    name: newOwnerName,
                    email: newOwnerEmail,
                    phone: newOwnerPhone || null,
                    token: newToken,
                },
            });
        } catch (e) {
            // Update in memory
            ticketStorage.update(ticketId, {
                name: newOwnerName,
                email: newOwnerEmail,
                phone: newOwnerPhone || null,
                token: newToken,
            });
        }

        // In production, send confirmation emails to both old and new owner

        return NextResponse.json({
            success: true,
            ticketId,
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
