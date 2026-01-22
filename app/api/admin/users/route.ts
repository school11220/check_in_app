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
    console.log('[API] User Creation Limit Request from:', userId);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const role = await getUserRole(userId);
        if (role !== 'ADMIN') {
            console.warn('[API] Unauthorized access attempt by:', userId, 'Role:', role);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, password, role: userRole, assignedEventIds } = body;
        console.log('[API] Processing user:', email, 'Role:', userRole);

        const client = await clerkClient();
        let clerkUserId = '';

        // 1. Check if user already exists in Clerk
        let existingUsers;
        try {
            existingUsers = await client.users.getUserList({ emailAddress: [email] });
        } catch (e: any) {
            console.error('[API] Clerk getUserList failed:', e);
            return NextResponse.json({ error: 'Clerk connection failed: ' + e.message }, { status: 500 });
        }

        if (existingUsers.data.length > 0) {
            // User exists - UPDATE existing user
            const existingUser = existingUsers.data[0];
            clerkUserId = existingUser.id;
            console.log('[API] User exists in Clerk:', clerkUserId);

            try {
                // Ensure we only update metadata, NOT password.
                // Updating password on OAuth users throws errors.
                await client.users.updateUser(clerkUserId, {
                    publicMetadata: {
                        role: userRole
                    }
                });
                console.log(`[API] Updated existing user metadata for ${email}`);
            } catch (e: any) {
                console.error('[API] Clerk updateUser failed:', e);
                return NextResponse.json({ error: 'Failed to update Clerk user: ' + e.message }, { status: 500 });
            }
        } else {
            // User does not exist - CREATE new user
            console.log('[API] Creating new user in Clerk...');
            try {
                // Generate username from email (before @, remove special chars)
                const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);

                const clerkUser = await client.users.createUser({
                    emailAddress: [email],
                    password: password,
                    username: username,
                    firstName: name.split(' ')[0],
                    lastName: name.split(' ').slice(1).join(' ') || '',
                    publicMetadata: {
                        role: userRole
                    }
                });
                clerkUserId = clerkUser.id;
                console.log(`[API] Created new user ${email} id: ${clerkUserId}`);
            } catch (e: any) {
                console.error('[API] Clerk createUser failed:', JSON.stringify(e, null, 2));
                // Extract meaningful error from Clerk response - check multiple formats
                let msg = 'Unknown error';
                if (e.errors && Array.isArray(e.errors) && e.errors.length > 0) {
                    // Clerk returns errors as [{message, longMessage, code}]
                    msg = e.errors.map((err: any) => err.longMessage || err.message || err.code).join(', ');
                } else if (e.clerkError && e.errors) {
                    msg = JSON.stringify(e.errors);
                } else if (e.message) {
                    msg = e.message;
                }
                return NextResponse.json({ error: msg }, { status: 422 });
            }
        }

        // 2. Create/Update in local DB for event assignments
        console.log('[API] Upserting to local DB...');
        let user;
        try {
            user = await prisma.user.upsert({
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
                    password: '', // We don't store passwords locally
                    role: userRole,
                    assignedEventIds: assignedEventIds || [],
                },
                select: { id: true, name: true, email: true, role: true, createdAt: true }
            });
        } catch (e: any) {
            console.error('[API] Database upsert failed:', e);
            return NextResponse.json({ error: 'Database error: ' + e.message }, { status: 500 });
        }

        // 3. Create audit log entry
        try {
            await prisma.auditLog.create({
                data: {
                    action: existingUsers.data.length > 0 ? 'UPDATE' : 'CREATE',
                    resource: 'User',
                    resourceId: user.id,
                    details: { name: user.name, email: user.email, role: user.role },
                    userId: userId,
                    userName: name,
                    userRole: role!,
                }
            });
        } catch (e) {
            console.warn('[API] Audit log creation failed (ignoring):', e);
        }

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('[API] Unexpected Fatal Error:', error);

        let errorMessage = error.message;
        if (error.errors?.[0]?.message) {
            errorMessage = error.errors[0].message;
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
