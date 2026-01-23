import { auth, clerkClient } from '@clerk/nextjs/server';

// Updated to use Clerk authentication
export async function getSession() {
    try {
        const { userId } = await auth();
        if (!userId) return null;

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
