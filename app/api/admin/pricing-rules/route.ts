import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ORGANIZER' && session.user.role !== 'ORGANISER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.pricingRule.findMany({
        include: { Event: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rules);
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ORGANIZER' && session.user.role !== 'ORGANISER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { eventId, triggerType, triggerValue, adjustmentType, adjustmentValue } = body;

        const rule = await prisma.pricingRule.create({
            data: {
                id: crypto.randomUUID(),
                Event: { connect: { id: eventId } },
                triggerType, // TIME_BASED, DEMAND_BASED
                triggerValue: Number(triggerValue),
                adjustmentType, // PERCENTAGE, FIXED
                adjustmentValue: Number(adjustmentValue),
                active: true,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(rule);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }
}
