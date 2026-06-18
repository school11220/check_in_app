import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function csvField(value: unknown): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function rowToCsv(values: (string | number | null | undefined)[]): string {
    return values.map(csvField).join(',');
}

function formatPaise(p: number | null | undefined): string {
    if (!p) return '0.00';
    return (p / 100).toFixed(2);
}

/**
 * GET /api/events/[id]/export?format=csv&status=...
 *
 * Server-side attendee export. Returns a UTF-8 BOM + CRLF CSV that opens
 * cleanly in Excel. Admin/organizer only, scoped to events they can manage.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        if (!hasRole(session.user.role, ORGANIZER_ROLES)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!hasEventAccess(session, eventId)) {
            return NextResponse.json({ error: 'You do not have access to this event' }, { status: 403 });
        }

        const url = new URL(req.url);
        const status = url.searchParams.get('status') || '';

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const where: any = { eventId };
        if (status && status !== 'all') {
            where.status = status;
        }

        const tickets = await prisma.ticket.findMany({
            where,
            orderBy: { createdAt: 'asc' },
        });

        const headers = [
            'Ticket ID',
            'Name',
            'Email',
            'Phone',
            'Status',
            'Checked In',
            'Checked In At',
            'Amount Paid (INR)',
            'Discount (INR)',
            'Refunded (INR)',
            'Created At',
            'Event',
        ];
        const lines: string[] = [rowToCsv(headers)];

        for (const t of tickets) {
            lines.push(rowToCsv([
                t.id,
                t.name,
                t.email || '',
                t.phone || '',
                t.status,
                t.checkedIn ? 'Yes' : 'No',
                t.checkedInAt ? new Date(t.checkedInAt).toISOString() : '',
                formatPaise(t.amountPaid),
                formatPaise(t.discountAmount),
                formatPaise(t.refundedAmount),
                new Date(t.createdAt).toISOString(),
                event.name,
            ]));
        }

        const csv = '\uFEFF' + lines.join('\r\n');
        const safeName = event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="attendees-${safeName}.csv"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('Export error:', err);
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
    }
}
