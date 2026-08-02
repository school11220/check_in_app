import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { clerkRoleKey, getCurrentClerkRole, normalizeLegacyRole } from '@/lib/clerk-roles';

// POST: Create a new user in Clerk with role
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { userId, orgId, role: currentRole } = await getCurrentClerkRole();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clerkClient();
        if (currentRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Only admins can create users' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, name, role, assignedEventIds } = body;

        if (!email || !role) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
        }
        const appRole = normalizeLegacyRole(role);
        if (appRole === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Check if user already exists in Clerk
        const existingUsers = await client.users.getUserList({ emailAddress: [email] });

        if (existingUsers.data.length > 0) {
            // Update existing user's role
            // Only update password if provided
            if (password && password.length >= 8) {
                await client.users.updateUser(existingUsers.data[0].id, {
                    password: password
                });
            } else if (password && password.length < 8) {
                return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
            }

            await client.users.updateUser(existingUsers.data[0].id, {
                publicMetadata: { role: appRole, assignedEventIds: assignedEventIds || [] }
            });
            if (orgId) {
                try {
                    await client.organizations.updateOrganizationMembership({
                        organizationId: orgId,
                        userId: existingUsers.data[0].id,
                        role: clerkRoleKey(appRole),
                    });
                } catch {
                    await client.organizations.createOrganizationMembership({
                        organizationId: orgId,
                        userId: existingUsers.data[0].id,
                        role: clerkRoleKey(appRole),
                    });
                }
            }
            return NextResponse.json({
                success: true,
                message: 'User role updated',
                userId: existingUsers.data[0].id
            });
        }

        // New User Validation
        if (!password) {
            return NextResponse.json({ error: 'Password is required for new users' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Generate unique username
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 6);
        const username = `user_${timestamp}_${randomPart}`;

        // Create new user in Clerk
        const newUser = await client.users.createUser({
            emailAddress: [email],
            password: password,
            username: username,
            firstName: name?.split(' ')[0] || 'User',
            lastName: name?.split(' ').slice(1).join(' ') || '',
            publicMetadata: {
                role: appRole,
                assignedEventIds: assignedEventIds || []
            }
        });

        if (orgId) {
            await client.organizations.createOrganizationMembership({
                organizationId: orgId,
                userId: newUser.id,
                role: clerkRoleKey(appRole),
            });
        }

        return NextResponse.json({
            success: true,
            message: 'User created successfully',
            userId: newUser.id,
            email: email
        });

    } catch (error: any) {
        console.error('Create user error:', error);
        const msg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || error.message;
        return NextResponse.json({ error: msg || 'Failed to create user' }, { status: 500 });
    }
}

// GET: List all Clerk users with their roles
export async function GET() {
    try {
        const { userId, orgId, role: currentRole } = await getCurrentClerkRole();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clerkClient();
        if (currentRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Only admins can view users' }, { status: 403 });
        }

        if (orgId) {
            const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 });
            const formattedMembers = await Promise.all(memberships.data.map(async membership => {
                const memberId = membership.publicUserData?.userId;
                const user = memberId ? await client.users.getUser(memberId) : null;
                return {
                    id: memberId || membership.id,
                    email: user?.emailAddresses[0]?.emailAddress || membership.publicUserData?.identifier || '',
                    name: `${membership.publicUserData?.firstName || ''} ${membership.publicUserData?.lastName || ''}`.trim() || 'Unknown',
                    role: normalizeLegacyRole(membership.role.replace(/^org:/, '')),
                    assignedEventIds: (user?.publicMetadata?.assignedEventIds as string[]) || [],
                    createdAt: membership.createdAt,
                };
            }));
            return NextResponse.json(formattedMembers);
        }

        const users = await client.users.getUserList({ limit: 100 });

        const formattedUsers = users.data.map(user => ({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
            role: normalizeLegacyRole(user.publicMetadata?.role),
            assignedEventIds: (user.publicMetadata?.assignedEventIds as string[]) || [],
            createdAt: user.createdAt
        }));

        return NextResponse.json(formattedUsers);

    } catch (error: any) {
        console.error('Get users error:', error);
        return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
    }
}

// DELETE: Remove a user from Clerk
export async function DELETE(request: Request) {
    try {
        const { userId: currentUserId, orgId, role: currentRole } = await getCurrentClerkRole();
        if (!currentUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clerkClient();
        if (currentRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userIdToDelete = searchParams.get('userId');

        if (!userIdToDelete) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Don't allow deleting yourself
        if (userIdToDelete === currentUserId) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        if (orgId) {
            await client.organizations.deleteOrganizationMembership({ organizationId: orgId, userId: userIdToDelete });
        } else {
            await client.users.deleteUser(userIdToDelete);
        }

        return NextResponse.json({ success: true, message: 'User deleted' });

    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
