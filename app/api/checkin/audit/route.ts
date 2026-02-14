import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

const ALLOWED_ROLES = ['ADMIN', 'ORGANIZER', 'ORGANISER'];

async function getUserRole(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
  } catch { return 'UNAUTHORIZED'; }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    let logs: any[] = [];
    try {
      logs = await prisma.checkInLog.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        include: { ticket: { select: { name: true, email: true, phone: true } } },
      });
    } catch {
      // CheckInLog table may not exist yet, return empty
      return NextResponse.json([]);
    }

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
