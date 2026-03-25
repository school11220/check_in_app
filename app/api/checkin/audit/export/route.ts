import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { verifyAuditChecksum } from '@/lib/qr-security';
import { enforceRateLimit } from '@/lib/rate-limit';

const ALLOWED_ROLES = ['ADMIN', 'ORGANIZER', 'ORGANISER'];

async function getUserRole(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
  } catch { return 'UNAUTHORIZED'; }
}

// GET: Export audit logs as CSV
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const rateLimited = await enforceRateLimit(req, 'checkin-audit-export', { requests: 10, window: '1 m' }, userId);
    if (rateLimited) return rateLimited;

    const role = await getUserRole(userId);
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    const format = url.searchParams.get('format') || 'csv';

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    let logs: any[] = [];
    try {
      logs = await prisma.checkInLog.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
        include: { ticket: { select: { name: true, email: true } } },
      });
    } catch {
      return NextResponse.json({ error: 'Audit log table not available' }, { status: 404 });
    }

    // Verify checksums for tamper evidence
    const verifiedLogs = logs.map(log => ({
      ...log,
      checksumValid: verifyAuditChecksum(
        log.ticketId,
        log.action,
        log.createdAt.toISOString(),
        log.performedBy,
        log.checksum
      ),
    }));

    if (format === 'json') {
      return NextResponse.json(verifiedLogs);
    }

    // CSV export
    const headers = [
      'Log ID', 'Ticket ID', 'Attendee Name', 'Attendee Email',
      'Action', 'Performed By', 'Role', 'Device ID',
      'IP Address', 'Timestamp', 'Synced At', 'Checksum', 'Checksum Valid'
    ];

    const rows = verifiedLogs.map(log => [
      log.id,
      log.ticketId,
      log.ticket?.name || '',
      log.ticket?.email || '',
      log.action,
      log.performedBy,
      log.performedRole,
      log.deviceId || '',
      log.ipAddress || '',
      new Date(log.createdAt).toISOString(),
      log.syncedAt ? new Date(log.syncedAt).toISOString() : '',
      log.checksum,
      log.checksumValid ? 'YES' : 'TAMPERED',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${eventId}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Audit export error:', error);
    return NextResponse.json({ error: 'Failed to export audit logs' }, { status: 500 });
  }
}
