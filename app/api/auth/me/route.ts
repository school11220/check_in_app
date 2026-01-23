import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from Clerk
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const role = (clerkUser.publicMetadata?.role as string) || 'UNAUTHORIZED';

        if (role === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get additional info from Clerk metadata
        const assignedEventIds = (clerkUser.publicMetadata?.assignedEventIds as string[]) || [];

        return NextResponse.json({
            id: userId,
            name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : clerkUser.emailAddresses[0]?.emailAddress,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            role: role,
            assignedEventIds: assignedEventIds
        });
    } catch (error) {
        console.error('Auth check failed:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
