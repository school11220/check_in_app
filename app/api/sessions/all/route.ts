import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessions = await prisma.session.findMany({
            include: {
                event: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                slot: true
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });

        return NextResponse.json(sessions);
    } catch (error) {
        console.error('Failed to fetch all sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}
