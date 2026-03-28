import { auth, clerkClient } from '@clerk/nextjs/server';
import { syncUserById } from '@/lib/user-sync';

export const ADMIN_ROLES = ['ADMIN'] as const;
export const ORGANIZER_ROLES = ['ADMIN', 'ORGANIZER', 'ORGANISER'] as const;
export const CHECKIN_ROLES = ['ADMIN', 'ORGANIZER', 'ORGANISER', 'SCANNER'] as const;

// Updated to use Clerk authentication
export async function getSession() {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const syncedUser = await syncUserById(userId).catch(() => null);

        if (syncedUser && syncedUser.role !== 'UNAUTHORIZED' && syncedUser.isActive) {
            return {
                user: {
                    id: syncedUser.id,
                    name: syncedUser.name || syncedUser.email,
                    email: syncedUser.email,
                    role: syncedUser.role,
                    assignedEventIds: syncedUser.assignedEventIds || [],
                }
            };
        }

        // Get user from Clerk
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const role = (clerkUser.publicMetadata?.role as string) || 'UNAUTHORIZED';

        if (role === 'UNAUTHORIZED') {
            return null;
        }

        // Get assignedEventIds from Clerk metadata
        const assignedEventIds = (clerkUser.publicMetadata?.assignedEventIds as string[]) || [];

        // Return session-like object for backward compatibility
        return {
            user: {
                id: userId,
                name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : clerkUser.emailAddresses[0]?.emailAddress,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                role: role,
                assignedEventIds: assignedEventIds,
            }
        };
    } catch (error) {
        console.error('getSession error:', error);
        return null;
    }
}

export function hasRole(role: string | undefined, allowedRoles: readonly string[]) {
    return !!role && allowedRoles.includes(role);
}

export function hasEventAccess(
    session: Awaited<ReturnType<typeof getSession>>,
    eventId: string
) {
    if (!session) return false;
    if (session.user.role === 'ADMIN') return true;

    if (session.user.role === 'ORGANIZER' || session.user.role === 'ORGANISER' || session.user.role === 'SCANNER') {
        return (session.user.assignedEventIds || []).includes(eventId);
    }

    return false;
}
