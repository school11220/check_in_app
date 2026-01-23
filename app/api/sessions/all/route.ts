import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user has a valid role
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const role = user.publicMetadata?.role as string;

        if (!role || role === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessions = await prisma.session.findMany({
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

        return NextResponse.json(sessions);
    } catch (error) {
        console.error('Failed to fetch all sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}
