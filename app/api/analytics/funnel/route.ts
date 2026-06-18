import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

interface FunnelStage {
    stage: string;
    count: number;
    conversion: number;     // % of previous stage
    overallConversion: number; // % of top stage
}

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const eventIds = request.nextUrl.searchParams.getAll('eventId');
    const baseWhere: any = {};
    if (eventIds.length > 0) baseWhere.eventId = { in: eventIds };

    const [
        viewed,         // page views proxy: distinct events with at least one ticket
        initiated,      // ticket rows in 'pending'
        paid,           // 'paid' or 'partially_refunded'
        checkedIn,      // checkedIn = true
        cancelled,      // 'cancelled'
        refunded,       // 'refunded'
    ] = await Promise.all([
        prisma.event.count({ where: { isActive: true, ...(eventIds.length ? { id: { in: eventIds } } : {}) } }),
        prisma.ticket.count({ where: { ...baseWhere, status: 'pending' } }),
        prisma.ticket.count({ where: { ...baseWhere, status: { in: ['paid', 'partially_refunded'] } } }),
        prisma.ticket.count({ where: { ...baseWhere, status: { in: ['paid', 'partially_refunded'] }, checkedIn: true } }),
        prisma.ticket.count({ where: { ...baseWhere, status: 'cancelled' } }),
        prisma.ticket.count({ where: { ...baseWhere, status: 'refunded' } }),
    ]).catch((e) => {
        console.error('Funnel query failed', e);
        return [0, 0, 0, 0, 0, 0];
    });

    const stages: FunnelStage[] = [
        { stage: 'Active Events', count: viewed, conversion: 100, overallConversion: 100 },
        { stage: 'Pending Tickets', count: initiated, conversion: pct(initiated, viewed), overallConversion: pct(initiated, viewed) },
        { stage: 'Paid', count: paid, conversion: pct(paid, initiated), overallConversion: pct(paid, viewed) },
        { stage: 'Checked In', count: checkedIn, conversion: pct(checkedIn, paid), overallConversion: pct(checkedIn, viewed) },
    ];

    const totals = {
        initiated,
        paid,
        cancelled,
        refunded,
        abandonedRate: pct(initiated - paid, initiated),
    };

    return NextResponse.json({ stages, totals });
}

function pct(n: number, d: number): number {
    if (!d) return 0;
    return Math.round((n / d) * 1000) / 10;
}
