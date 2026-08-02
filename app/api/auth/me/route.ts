import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { syncUserById } from '@/lib/user-sync';
import { resolveRole } from '@/lib/clerk-role-utils';

export async function GET(request: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimited = await enforceRateLimit(request, 'auth-me', { requests: 60, window: '1 m' }, userId);
        if (rateLimited) return rateLimited;

        const syncedUser = await syncUserById(userId).catch(() => null);
        if (syncedUser) {
            const role = resolveRole(orgRole, syncedUser.role);
            if (role === 'UNAUTHORIZED' || !syncedUser.isActive) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            return NextResponse.json({
                id: syncedUser.id,
                name: syncedUser.name || syncedUser.email,
                email: syncedUser.email,
                role,
                assignedEventIds: syncedUser.assignedEventIds || [],
                organizationId: orgId || null,
            });
        }

        // Get user from Clerk
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const role = resolveRole(orgRole, clerkUser.publicMetadata?.role);

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
            assignedEventIds: assignedEventIds,
            organizationId: orgId || null,
        });
    } catch (error) {
        console.error('Auth check failed:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
