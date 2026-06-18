import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeTicketAccess } from '@/lib/ticket-access';
import { generateICSContent } from '@/lib/calendar-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tickets/[id]/ics
 *
 * Returns a downloadable .ics file for the event the ticket is for.
 * Public-ish: gated by ticket access (token / owner / organizer).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ticketId } = await params;
        const url = new URL(req.url);
        const providedToken = url.searchParams.get('token');

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { Event: true },
        });
        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const access = await authorizeTicketAccess(ticket, providedToken);
        if (!access.allowed) {
            return NextResponse.json({ error: 'Ticket token or authorized session required' }, { status: 401 });
        }

        const event = ticket.Event;
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const start = new Date(event.date);
        // Estimate duration: endTime - startTime, default 2h
        let end: Date;
        if (event.endTime && event.startTime) {
            const [sh, sm] = event.startTime.split(':').map(Number);
            const [eh, em] = event.endTime.split(':').map(Number);
            end = new Date(start);
            end.setHours(eh || (sh + 2), em || sm, 0, 0);
            if (end <= start) end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        } else {
            end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        }

        const ics = generateICSContent({
            title: event.name,
            description: `Your ticket for ${event.name}. Ticket ID: ${ticket.id}`,
            location: [event.venue, event.address].filter(Boolean).join(', ') || undefined,
            startDate: start,
            endDate: end,
            url: `${url.origin}/ticket/${ticket.id}`,
        });

        return new NextResponse(ics, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="event-${event.id}.ics"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        console.error('Error generating ics:', err);
        return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 });
    }
}
