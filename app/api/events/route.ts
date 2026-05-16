import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDynamicPrice } from '@/lib/pricing';
import { getSession, hasEventAccess } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const events = await prisma.event.findMany({
            include: { PricingRule: true },
            orderBy: { date: 'asc' },
        });

        const eventsWithPrice = events.map(event => {
            const eventForPricing = {
                ...event,
                pricingRules: event.PricingRule // Map Prisma relation name to expected interface property
            };
            return {
                ...event,
                currentPrice: calculateDynamicPrice(eventForPricing as any)
            };
        });

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

        const rest = await request.json();
        delete rest.id;

        // Validate required fields
        if (!rest.name || !rest.date) {
            return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
        }

        const event = await prisma.event.create({
            data: {
                id: crypto.randomUUID(),
                ...rest,
                organizer: rest.organizer || session.user.name || session.user.email,
                organizerId: session.user.id,
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
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...data } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        if (!hasEventAccess(session, id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updateData: Record<string, unknown> = {};
        const allowedFields = [
            'name', 'description', 'startTime', 'endTime', 'venue', 'address',
            'price', 'entryFee', 'prizePool', 'category', 'imageUrl', 'capacity',
            'isActive', 'isFeatured', 'organizer', 'contactEmail', 'contactPhone',
            'termsAndConditions', 'registrationDeadline', 'earlyBirdEnabled',
            'earlyBirdPrice', 'earlyBirdDeadline', 'sendReminders', 'videoLink',
            'organizerVideoLink', 'tags', 'registrationFields', 'schedule',
            'speakers', 'sponsors', 'gallery'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        if (data.date) updateData.date = new Date(data.date);
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.entryFee !== undefined) updateData.entryFee = Number(updateData.entryFee);
        if (updateData.prizePool !== undefined) updateData.prizePool = Number(updateData.prizePool);
        if (updateData.capacity !== undefined) updateData.capacity = Number(updateData.capacity);
        if (updateData.earlyBirdPrice !== undefined) updateData.earlyBirdPrice = Number(updateData.earlyBirdPrice);

        const event = await prisma.event.update({
            where: { id },
            data: updateData,
        });

        await logAudit({
            action: 'UPDATE',
            resource: 'EVENT',
            resourceId: id,
            details: { eventName: event.name, changes: Object.keys(updateData) },
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userRole: session.user.role,
        });

        return NextResponse.json(event);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const event = await prisma.event.findUnique({ where: { id }, select: { name: true } });
        await prisma.event.delete({ where: { id } });

        await logAudit({
            action: 'DELETE',
            resource: 'EVENT',
            resourceId: id,
            details: { eventName: event?.name },
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userRole: session.user.role,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
