import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Helper to get role from fresh Clerk user data
async function getUserRole(userId: string): Promise<string | undefined> {
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        return (user.publicMetadata?.role as string) || undefined;
    } catch {
        return undefined;
    }
}

export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole(userId);
    if (role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch users from local DB (these are team members with assigned roles)
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, assignedEventIds: true, createdAt: true }
    });

    return NextResponse.json(users);
}

export async function POST(request: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole(userId);
    if (role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, email, password, role: userRole, assignedEventIds } = body;
        const client = await clerkClient();
        let clerkUserId = '';

        // 1. Check if user already exists in Clerk
        const existingUsers = await client.users.getUserList({ emailAddress: [email] });

        if (existingUsers.data.length > 0) {
            // User exists - UPDATE them
            const existingUser = existingUsers.data[0];
            clerkUserId = existingUser.id;

            await client.users.updateUser(clerkUserId, {
                publicMetadata: {
                    role: userRole
                }
            });
            console.log(`Updated existing user ${email} with role ${userRole}`);
        } else {
            // User does not exist - CREATE them
            const clerkUser = await client.users.createUser({
                emailAddress: [email],
                password: password,
                firstName: name.split(' ')[0],
                lastName: name.split(' ').slice(1).join(' ') || '',
                publicMetadata: {
                    role: userRole
                }
            });
            clerkUserId = clerkUser.id;
            console.log(`Created new user ${email} with role ${userRole}`);
        }

        // 2. Create/Update in local DB for event assignments
        const user = await prisma.user.upsert({
            where: { id: clerkUserId },
            update: {
                name,
                email,
                role: userRole,
                assignedEventIds: assignedEventIds || [],
            },
            create: {
                id: clerkUserId,
                name,
                email,
                password: '', // Not storing password locally
                role: userRole,
                assignedEventIds: assignedEventIds || [],
            },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });

        // 3. Create audit log entry
        await prisma.auditLog.create({
            data: {
                action: existingUsers.data.length > 0 ? 'UPDATE' : 'CREATE',
                resource: 'User',
                resourceId: user.id,
                details: { name: user.name, email: user.email, role: user.role },
                userId: userId,
                userName: name,
                userRole: role || 'ADMIN',
            }
        });

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('Failed to create/update user:', error);

        // Handle specific Clerk errors
        let errorMessage = error.message;
        if (error.errors?.[0]?.message) {
            errorMessage = error.errors[0].message;
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
