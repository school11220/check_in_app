import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        if (!hasRole(session.user.role, ORGANIZER_ROLES)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        if (eventId && !hasEventAccess(session, eventId)) {
            return NextResponse.json({ error: 'You do not have access to this event' }, { status: 403 });
        }

        const where = eventId
            ? { eventId }
            : session.user.role === 'ADMIN'
                ? {}
                : { eventId: { in: session.user.assignedEventIds || [] } };

        const tickets = await prisma.ticket.findMany({
            where,
            include: { Event: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(tickets);
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }
}
