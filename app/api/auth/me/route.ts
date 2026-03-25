import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { syncUserById } from '@/lib/user-sync';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimited = await enforceRateLimit(request, 'auth-me', { requests: 60, window: '1 m' }, userId);
        if (rateLimited) return rateLimited;

        const syncedUser = await syncUserById(userId).catch(() => null);
        if (syncedUser) {
            if (syncedUser.role === 'UNAUTHORIZED' || !syncedUser.isActive) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            return NextResponse.json({
                id: syncedUser.id,
                name: syncedUser.name || syncedUser.email,
                email: syncedUser.email,
                role: syncedUser.role,
                assignedEventIds: syncedUser.assignedEventIds || [],
            });
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
