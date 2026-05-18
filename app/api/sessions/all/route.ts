import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasRole, ORGANIZER_ROLES } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const where = session.user.role === 'ADMIN'
            ? {}
            : { eventId: { in: session.user.assignedEventIds || [] } };

        const sessions = await prisma.session.findMany({
            where,
            include: {
                Event: {
                    select: {
                        name: true,
                        id: true
                    }
                }

            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });

        return NextResponse.json(sessions.map(({ Event, ...item }) => ({
            ...item,
            event: Event,
        })));
    } catch (error) {
        console.error('Failed to fetch all sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}
