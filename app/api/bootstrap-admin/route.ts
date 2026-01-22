import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// This is a one-time bootstrap endpoint to set the first admin
// After using it, you should delete this file or secure it
export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'You must be logged in to use this' }, { status: 401 });
        }

        // Get secret from request
        const body = await request.json();
        const { secret } = body;

        // Simple secret check - change this or delete this file after first use
        if (secret !== 'MAKE_ME_ADMIN_2026') {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
        }

        // Set the current user as ADMIN
        const client = await clerkClient();
        await client.users.updateUser(userId, {
            publicMetadata: {
                role: 'ADMIN'
            }
        });

        return NextResponse.json({
            success: true,
            message: 'You are now an ADMIN! Refresh the page and go to /admin'
        });
    } catch (error: any) {
        console.error('Bootstrap error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
