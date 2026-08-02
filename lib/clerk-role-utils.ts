export type AppRole = 'ADMIN' | 'ORGANIZER' | 'SCANNER' | 'UNAUTHORIZED';

const ORG_ROLE_MAP: Record<string, AppRole> = {
  admin: 'ADMIN', organizer: 'ORGANIZER', organiser: 'ORGANIZER', scanner: 'SCANNER',
};

export function normalizeOrganizationRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  return ORG_ROLE_MAP[role.toLowerCase().replace(/^org:/, '')] || null;
}

export function normalizeLegacyRole(role: unknown): AppRole {
  const value = typeof role === 'string' ? role.toUpperCase() : '';
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'ORGANIZER' || value === 'ORGANISER') return 'ORGANIZER';
  if (value === 'SCANNER') return 'SCANNER';
  return 'UNAUTHORIZED';
}

export function resolveRole(orgRole: string | null | undefined, legacyRole: unknown): AppRole {
  return orgRole ? normalizeOrganizationRole(orgRole) || 'UNAUTHORIZED' : normalizeLegacyRole(legacyRole);
}
