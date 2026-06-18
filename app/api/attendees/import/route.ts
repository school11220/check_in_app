import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess } from '@/lib/auth';

interface ImportRow {
    name?: string;
    email?: string;
    phone?: string;
    amountPaid?: number;
    status?: string;
    notes?: string;
}

function parseCSV(text: string): ImportRow[] {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
            row[h] = cols[idx] ?? '';
        });
        rows.push({
            name: row['name'] || row['fullname'] || row['attendee'],
            email: row['email'],
            phone: row['phone'] || row['mobile'],
            amountPaid: row['amount'] || row['amountpaid']
                ? Number((row['amount'] || row['amountpaid']).replace(/[^0-9.]/g, '')) * 100
                : undefined,
            status: row['status'] || 'paid',
            notes: row['notes'] || row['comment'],
        });
    }
    return rows;
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    if (!hasEventAccess(session, eventId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let rows: ImportRow[] = [];
    if (contentType.includes('application/json')) {
        const body = await request.json();
        rows = Array.isArray(body) ? body : body.rows || [];
    } else if (
        contentType.includes('text/csv') ||
        contentType.includes('text/plain') ||
        contentType.includes('multipart/form-data')
    ) {
        const text = await request.text();
        rows = parseCSV(text);
    } else {
        return NextResponse.json({ error: 'Unsupported content-type' }, { status: 415 });
    }

    if (rows.length === 0) {
        return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
    }

    // Validate event and capacity
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, capacity: true, soldCount: true, price: true },
    });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const remaining = Math.max(0, event.capacity - event.soldCount);
    const toInsert = rows.slice(0, remaining);
    const skipped = rows.length - toInsert.length;

    const created: any[] = [];
    for (const row of toInsert) {
        if (!row.name) continue;
        const ticket = await prisma.ticket.create({
            data: {
                id: crypto.randomUUID(),
                name: row.name,
                email: row.email,
                phone: row.phone,
                eventId,
                status: row.status || 'paid',
                amountPaid: row.amountPaid ?? event.price,
                grossAmount: row.amountPaid ?? event.price,
                paymentMethod: 'import',
            },
        });
        created.push(ticket);
    }

    if (created.length > 0) {
        await prisma.event.update({
            where: { id: eventId },
            data: { soldCount: { increment: created.length } },
        });
    }

    return NextResponse.json({
        imported: created.length,
        skipped,
        tickets: created,
    });
}
