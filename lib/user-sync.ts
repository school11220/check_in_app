import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

function getPrimaryEmail(clerkUser: any): string | null {
  const primaryId = clerkUser.primaryEmailAddressId;
  if (primaryId) {
    const primary = clerkUser.emailAddresses?.find((email: any) => email.id === primaryId);
    if (primary?.emailAddress) return primary.emailAddress;
  }
  return clerkUser.emailAddresses?.[0]?.emailAddress || null;
}

function mapRole(clerkUser: any): string {
  return (clerkUser.publicMetadata?.role as string) || 'UNAUTHORIZED';
}

function mapAssignedEventIds(clerkUser: any): string[] {
  const assigned = clerkUser.publicMetadata?.assignedEventIds;
  if (!Array.isArray(assigned)) return [];
  return assigned.filter((item: unknown) => typeof item === 'string');
}

export async function upsertUserFromClerk(clerkUser: any) {
  const email = getPrimaryEmail(clerkUser);
  if (!email) return null;

  const firstName = clerkUser.firstName || null;
  const lastName = clerkUser.lastName || null;
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || email;

  return prisma.user.upsert({
    where: { id: clerkUser.id },
    update: {
      email,
      firstName,
      lastName,
      name: fullName,
      imageUrl: clerkUser.imageUrl || null,
      role: mapRole(clerkUser),
      assignedEventIds: mapAssignedEventIds(clerkUser),
      isActive: true,
    },
    create: {
      id: clerkUser.id,
      email,
      firstName,
      lastName,
      name: fullName,
      imageUrl: clerkUser.imageUrl || null,
      role: mapRole(clerkUser),
      assignedEventIds: mapAssignedEventIds(clerkUser),
      isActive: true,
    },
  });
}

export async function syncUserById(userId: string) {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  return upsertUserFromClerk(clerkUser);
}
