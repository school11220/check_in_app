import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'You must be logged in to use this' }, { status: 401 });
        }

        const body = await request.json();
        const { secret } = body;
        const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

        if (!bootstrapSecret) {
            return NextResponse.json({ error: 'Bootstrap is disabled' }, { status: 404 });
        }

        if (secret !== bootstrapSecret) {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
        }

        const existingAdminCount = await prisma.user.count({
            where: { role: 'ADMIN', isActive: true }
        }).catch(() => 0);

        if (existingAdminCount > 0) {
            return NextResponse.json({ error: 'Bootstrap already completed' }, { status: 403 });
        }

        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;

        if (!primaryEmail) {
            return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
        }

        await client.users.updateUser(userId, {
            publicMetadata: {
                role: 'ADMIN'
            }
        });

        await prisma.user.upsert({
            where: { id: userId },
            create: {
                id: userId,
                email: primaryEmail,
                firstName: clerkUser.firstName || null,
                lastName: clerkUser.lastName || null,
                name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || primaryEmail,
                imageUrl: clerkUser.imageUrl || null,
                role: 'ADMIN',
            },
            update: {
                email: primaryEmail,
                firstName: clerkUser.firstName || null,
                lastName: clerkUser.lastName || null,
                name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || primaryEmail,
                imageUrl: clerkUser.imageUrl || null,
                role: 'ADMIN',
                isActive: true,
            }
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            message: 'You are now an ADMIN! Refresh the page and go to /admin'
        });
    } catch (error: any) {
        console.error('Bootstrap error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
