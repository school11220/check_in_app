import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all slots
        const slots = await prisma.timeSlot.findMany({
            orderBy: { startTime: 'asc' }
        });

        // Deduplicate slots based on start/end time to avoid clutter
        // For global view, we might want to just show unique time ranges
        const uniqueSlotsMap = new Map();
        slots.forEach(slot => {
            const key = `${slot.startTime}-${slot.endTime}`;
            if (!uniqueSlotsMap.has(key)) {
                uniqueSlotsMap.set(key, slot);
            }
        });

        const uniqueSlots = Array.from(uniqueSlotsMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));

        return NextResponse.json(uniqueSlots);
    } catch (error) {
        console.error('Failed to fetch all slots:', error);
        return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }
}
