import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all sessions for an event
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date');

        const where: any = { eventId: id };
        if (date) {
            where.date = date;
        }

        const sessions = await prisma.session.findMany({
            where,
            orderBy: { startTime: 'asc' }
        });
        return NextResponse.json(sessions);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

// POST: Create a new session
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        // Find TimeSlot ID based on start time if possible, or just link by event
        // Schema says Session has slotId. We need to find the slot.
        // Or we might have passed slotId in body?
        // Let's assume we find the slot by startTime and eventId.

        const session = await prisma.session.create({
            data: {
                eventId: id,
                ...body
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

// DELETE: Delete session
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const searchParams = request.nextUrl.searchParams;
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        await prisma.session.delete({
            where: { id: sessionId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
