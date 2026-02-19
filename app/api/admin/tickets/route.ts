import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        const where = eventId ? { eventId } : {};

        const tickets = await prisma.ticket.findMany({
            where,
            include: { Event: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(tickets);
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }
}
