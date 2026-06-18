import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Public endpoint: add yourself to the waitlist
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await params;
    const body = await request.json();
    const { name, email, phone, ticketCount } = body || {};

    if (!name || !email) {
        return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Prevent duplicate waiting entries for the same email/event
    const existing = await prisma.waitlistEntry.findFirst({
        where: { eventId, email, status: 'waiting' },
    });
    if (existing) {
        return NextResponse.json({ entry: existing, deduped: true });
    }

    const entry = await prisma.waitlistEntry.create({
        data: {
            eventId,
            name,
            email,
            phone: phone || null,
            ticketCount: ticketCount || 1,
            status: 'waiting',
        },
    });

    return NextResponse.json({ entry });
}

// Authenticated: list waitlist entries for an event
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: eventId } = await params;
    const entries = await prisma.waitlistEntry.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(entries);
}
