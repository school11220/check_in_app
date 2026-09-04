import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { clerkRoleKey, getCurrentClerkRole, normalizeLegacyRole } from '@/lib/clerk-roles';
import { paginationMeta, parsePagination } from '@/lib/pagination';

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
        const { email, name, role, assignedEventIds } = body;
        const expiresInDays = Math.min(30, Math.max(1, Number(body.expiresInDays || 7)));

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
            await client.users.updateUser(existingUsers.data[0].id, {
                firstName: name?.trim().split(/\s+/)[0] || existingUsers.data[0].firstName || undefined,
                lastName: name?.trim().split(/\s+/).slice(1).join(' ') || existingUsers.data[0].lastName || undefined,
                publicMetadata: { ...existingUsers.data[0].publicMetadata, role: appRole, assignedEventIds: assignedEventIds || [] }
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

        const redirectUrl = `${new URL(request.url).origin}/login`;
        if (orgId) {
            const invitation = await client.organizations.createOrganizationInvitation({
                organizationId: orgId,
                inviterUserId: userId,
                emailAddress: email,
                role: clerkRoleKey(appRole),
                redirectUrl,
                publicMetadata: { assignedEventIds: assignedEventIds || [], name: name || '' },
                expiresInDays,
            });
            return NextResponse.json({ success: true, message: 'Secure organization invitation sent', invitationId: invitation.id });
        }
        const invitation = await client.invitations.createInvitation({
            emailAddress: email,
            redirectUrl,
            notify: true,
            publicMetadata: { role: appRole, assignedEventIds: assignedEventIds || [], name: name || '' },
            expiresInDays,
        });
        return NextResponse.json({ success: true, message: 'Secure invitation sent', invitationId: invitation.id });

    } catch (error: any) {
        console.error('Create user error:', error);
        const msg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || error.message;
        return NextResponse.json({ error: msg || 'Failed to create user' }, { status: 500 });
    }
}

// GET: List all Clerk users with their roles
export async function GET(request: Request) {
    try {
        const { userId, orgId, role: currentRole } = await getCurrentClerkRole();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await clerkClient();
        if (currentRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Only admins can view users' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const { page, pageSize, skip } = parsePagination(searchParams);
        const q = (searchParams.get('q') || '').trim();
        if (orgId) {
            const matchedUsers = q ? await client.users.getUserList({ query: q, organizationId: [orgId], limit: pageSize, offset: skip }) : null;
            const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: pageSize, offset: matchedUsers ? 0 : skip, ...(matchedUsers ? { userId: matchedUsers.data.map(user => user.id) } : {}) });
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
                    lastActiveAt: user?.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null,
                    lastSignInAt: user?.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
                    accountStatus: user?.banned ? 'banned' : user?.locked ? 'locked' : 'active',
                    membershipActivityStatus: user?.lastActiveAt && Date.now() - user.lastActiveAt < 30 * 86400000 ? 'active' : 'inactive',
                };
            }));
            return NextResponse.json({ items: formattedMembers, pagination: paginationMeta(page, pageSize, matchedUsers?.totalCount ?? memberships.totalCount) });
        }

        const users = await client.users.getUserList({ limit: pageSize, offset: skip, ...(q ? { query: q } : {}) });

        const formattedUsers = users.data.map(user => ({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
            role: normalizeLegacyRole(user.publicMetadata?.role),
            assignedEventIds: (user.publicMetadata?.assignedEventIds as string[]) || [],
            createdAt: user.createdAt
            , lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null
            , lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null
            , accountStatus: user.banned ? 'banned' : user.locked ? 'locked' : 'active'
            , membershipActivityStatus: user.lastActiveAt && Date.now() - user.lastActiveAt < 30 * 86400000 ? 'active' : 'inactive'
        }));

        return NextResponse.json({ items: formattedUsers, pagination: paginationMeta(page, pageSize, users.totalCount) });

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
