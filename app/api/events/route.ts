import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDynamicPrice } from '@/lib/pricing';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function GET() {
    try {
        const events = await prisma.event.findMany({
            include: { PricingRule: true },
            orderBy: { date: 'asc' },
        });

        // Calculate dynamic price for each event
        const eventsWithPrice = events.map(event => ({
            ...event,
            currentPrice: calculateDynamicPrice(event as any)
        }));

        return NextResponse.json(eventsWithPrice);
    } catch (error) {
        console.error('Failed to fetch events:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Remove ID if present to ensure DB generates it
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = await request.json();

        // Validate required fields
        if (!rest.name || !rest.date) {
            return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
        }

        const event = await prisma.event.create({
            data: {
                ...rest,
                date: new Date(rest.date),
            },
        });

        // Validate that event was created with an ID
        if (!event || !event.id) {
            console.error('Event creation returned invalid data:', event);
            return NextResponse.json({ error: 'Failed to create event - invalid response' }, { status: 500 });
        }

        // Log event creation
        await logAudit({
            action: 'CREATE',
            resource: 'EVENT',
            resourceId: event.id,
            details: { eventName: event.name, category: event.category },
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userRole: session.user.role,
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error('Failed to create event:', error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        if (data.date) data.date = new Date(data.date);

        const event = await prisma.event.update({
            where: { id },
            data,
        });
        return NextResponse.json(event);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await prisma.event.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
