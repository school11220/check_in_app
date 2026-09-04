import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const where = {};

    const rules = await prisma.pricingRule.findMany({
        where,
        include: { Event: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    // Map Prisma Relation 'Event' to frontend expectation 'event'
    const formattedRules = rules.map(r => ({
        ...r,
        event: r.Event
    }));

    return NextResponse.json(formattedRules);
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    try {
        const body = await request.json();
        const { eventId, triggerType, triggerValue, adjustmentType, adjustmentValue } = body;
        if (!eventId) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });

        const rule = await prisma.pricingRule.create({
            data: {
                id: randomUUID(),
                Event: { connect: { id: eventId } },
                triggerType,
                triggerValue: Number(triggerValue),
                adjustmentType,
                adjustmentValue: Number(adjustmentValue),
                active: true,
                updatedAt: new Date(),
            },
            include: {
                Event: { select: { name: true } }
            }
        });

        return NextResponse.json({
            ...rule,
            event: rule.Event
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }
}
