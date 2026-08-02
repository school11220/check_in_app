import { auth, clerkClient } from '@clerk/nextjs/server';
import { resolveRole, normalizeLegacyRole, type AppRole } from '@/lib/clerk-role-utils';
export { resolveRole, normalizeLegacyRole } from '@/lib/clerk-role-utils';
export type { AppRole } from '@/lib/clerk-role-utils';

export async function getCurrentClerkRole() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) return { userId: null, orgId: null, role: 'UNAUTHORIZED' as AppRole };

  const user = await (await clerkClient()).users.getUser(userId);
  return {
    userId,
    orgId: orgId || null,
    role: resolveRole(orgRole, user.publicMetadata?.role),
  };
}

export function clerkRoleKey(role: string): string {
  return role.startsWith('org:') ? role : `org:${role.toLowerCase()}`;
}
