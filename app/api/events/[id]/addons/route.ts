import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess } from '@/lib/auth';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await params;
    const addons = await prisma.addOn.findMany({
        where: { eventId, isActive: true },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(addons);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: eventId } = await params;
    if (!hasEventAccess(session, eventId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const { name, description, priceInPaise, currency, maxQuantity, imageUrl } = body || {};
    if (!name || priceInPaise == null) {
        return NextResponse.json({ error: 'name and priceInPaise are required' }, { status: 400 });
    }
    const addon = await prisma.addOn.create({
        data: {
            eventId,
            name,
            description: description || null,
            priceInPaise: Number(priceInPaise),
            currency: currency || 'INR',
            maxQuantity: Number(maxQuantity || 100),
            imageUrl: imageUrl || null,
        },
    });
    return NextResponse.json(addon);
}
