import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getCurrentClerkRole } from '@/lib/clerk-roles';
import { badRequest, forbidden, respond, unauthorized } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

function serialize(invitation: any, organization = false) {
  return {
    id: invitation.id,
    email: invitation.emailAddress,
    status: invitation.status || 'pending',
    role: organization ? String(invitation.role || '').replace(/^org:/, '') : String(invitation.publicMetadata?.role || 'UNAUTHORIZED'),
    createdAt: new Date(invitation.createdAt).toISOString(),
    updatedAt: new Date(invitation.updatedAt).toISOString(),
    expiresAt: invitation.expiresAt ? new Date(invitation.expiresAt).toISOString() : null,
    organizationId: invitation.organizationId || null,
  };
}

export const GET = respond(async (request: NextRequest) => {
  const { userId, orgId, role } = await getCurrentClerkRole();
  if (!userId) throw unauthorized();
  if (role !== 'ADMIN') throw forbidden('Only admins can view invitations');
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') || 25)));
  const offset = (page - 1) * pageSize;
  const client = await clerkClient();
  if (orgId) {
    const result = await client.organizations.getOrganizationInvitationList({ organizationId: orgId, status: ['pending'], limit: pageSize, offset });
    return NextResponse.json({ items: result.data.map((item) => serialize(item, true)), pagination: { page, pageSize, total: result.totalCount, totalPages: Math.max(1, Math.ceil(result.totalCount / pageSize)) } });
  }
  const result = await client.invitations.getInvitationList({ status: 'pending', limit: pageSize, offset });
  return NextResponse.json({ items: result.data.map((item) => serialize(item)), pagination: { page, pageSize, total: result.totalCount, totalPages: Math.max(1, Math.ceil(result.totalCount / pageSize)) } });
}, { auth: 'admin' });

export const DELETE = respond(async (request: NextRequest) => {
  const { userId, orgId, role } = await getCurrentClerkRole();
  if (!userId) throw unauthorized();
  if (role !== 'ADMIN') throw forbidden();
  const id = request.nextUrl.searchParams.get('id');
  if (!id) throw badRequest('Invitation ID is required');
  const client = await clerkClient();
  if (orgId) await client.organizations.revokeOrganizationInvitation({ organizationId: orgId, invitationId: id, requestingUserId: userId });
  else await client.invitations.revokeInvitation(id);
  return NextResponse.json({ success: true, message: 'Invitation revoked' });
}, { auth: 'admin' });

export const POST = respond(async (request: NextRequest) => {
  const { userId, orgId, role } = await getCurrentClerkRole();
  if (!userId) throw unauthorized();
  if (role !== 'ADMIN') throw forbidden();
  const body = await request.json().catch(() => null) as { invitationId?: string } | null;
  if (!body?.invitationId) throw badRequest('Invitation ID is required');
  const client = await clerkClient();
  if (orgId) {
    const old = await client.organizations.getOrganizationInvitation({ organizationId: orgId, invitationId: body.invitationId });
    await client.organizations.revokeOrganizationInvitation({ organizationId: orgId, invitationId: body.invitationId, requestingUserId: userId });
    const remainingDays = Math.max(1, Math.ceil((old.expiresAt - Date.now()) / 86400000));
    const replacement = await client.organizations.createOrganizationInvitation({ organizationId: orgId, inviterUserId: userId, emailAddress: old.emailAddress, role: old.role, expiresInDays: Math.min(30, remainingDays), redirectUrl: `${new URL(request.url).origin}/login`, publicMetadata: old.publicMetadata });
    return NextResponse.json({ success: true, invitation: serialize(replacement, true) });
  }
  const old = (await client.invitations.getInvitationList({ query: body.invitationId, limit: 1 })).data[0];
  if (!old || old.id !== body.invitationId) throw badRequest('Invitation not found');
  await client.invitations.revokeInvitation(body.invitationId);
  const replacement = await client.invitations.createInvitation({ emailAddress: old.emailAddress, expiresInDays: 7, notify: true, redirectUrl: `${new URL(request.url).origin}/login`, publicMetadata: old.publicMetadata || {} });
  return NextResponse.json({ success: true, invitation: serialize(replacement) });
}, { auth: 'admin' });
