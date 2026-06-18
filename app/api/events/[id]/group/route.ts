import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess } from '@/lib/auth';

// Create a group registration (purchase-group of N tickets under one payment)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    // Allow public (guest) checkout: only require session for organizer actions.
    const { id: eventId } = await params;
    const body = await request.json();
    const { primaryName, primaryEmail, primaryPhone, memberCount } = body || {};

    if (!primaryName || !primaryEmail) {
        return NextResponse.json({ error: 'primaryName and primaryEmail are required' }, { status: 400 });
    }
    const count = Math.max(1, Number(memberCount || 1));

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, name: true, price: true, capacity: true, soldCount: true, entryFee: true },
    });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (event.soldCount + count > event.capacity) {
        return NextResponse.json({ error: 'Not enough capacity' }, { status: 409 });
    }

    const purchaseGroupId = `grp-${crypto.randomUUID()}`;
    const unitPrice = event.entryFee || event.price;
    const totalAmount = unitPrice * count;

    const group = await prisma.groupRegistration.create({
        data: {
            eventId,
            purchaseGroupId,
            primaryName,
            primaryEmail,
            primaryPhone: primaryPhone || null,
            memberCount: count,
            totalAmount,
            status: 'pending',
        },
    });

    return NextResponse.json({ group });
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: eventId } = await params;
    if (!hasEventAccess(session, eventId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const groups = await prisma.groupRegistration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(groups);
}
