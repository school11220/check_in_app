import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all slots for an event
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const slots = await prisma.timeSlot.findMany({
            where: { eventId: id },
            orderBy: { startTime: 'asc' }
        });
        return NextResponse.json(slots);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }
}

// POST: Create a new slot
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { startTime, endTime, label } = body;

        const slot = await prisma.timeSlot.create({
            data: {
                eventId: id,
                startTime,
                endTime,
                label
            }
        });

        return NextResponse.json(slot);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 });
    }
}

// DELETE: Delete ALL slots for an event (or specific one if id provided in query)
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const searchParams = request.nextUrl.searchParams;
        const slotId = searchParams.get('slotId');

        if (slotId) {
            // Delete specific slot
            await prisma.timeSlot.delete({
                where: { id: slotId }
            });
        } else {
            // Delete ALL slots for this event
            await prisma.timeSlot.deleteMany({
                where: { eventId: id }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete slots' }, { status: 500 });
    }
}
