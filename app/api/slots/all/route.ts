import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// This endpoint is called by SessionScheduler but slots don't exist as a model
// Return empty array for now to prevent 404 errors
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

        // Slots don't exist as a separate model, return empty array
        return NextResponse.json([]);
    } catch (error) {
        console.error('Failed to fetch slots:', error);
        return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }
}
