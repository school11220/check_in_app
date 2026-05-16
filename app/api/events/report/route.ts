import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const eventId = url.searchParams.get('eventId');
        const format = url.searchParams.get('format') || 'json';

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const session = await getSession();
        if (!session || !hasRole(session.user.role, ORGANIZER_ROLES) || !hasEventAccess(session, eventId)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const [event, tickets] = await Promise.all([
            prisma.event.findUnique({ where: { id: eventId } }),
            prisma.ticket.findMany({ where: { eventId } }),
        ]);

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Generate report data
        const paidTickets = tickets.filter(t => t.status === 'paid');
        const checkedIn = tickets.filter(t => t.checkedIn);
        const refunded = tickets.filter(t => t.status === 'refunded');
        const pending = tickets.filter(t => t.status === 'pending');
        const paidRevenue = paidTickets.reduce((sum, ticket) => sum + (ticket.amountPaid || event.price || 0), 0);
        const refundedAmount = refunded.reduce((sum, ticket) => sum + (ticket.amountPaid || event.price || 0), 0);

        const report = {
            event: {
                id: event.id,
                name: event.name,
                price: event.price,
                capacity: (event as any).capacity || 0,
            },
            summary: {
                totalTickets: tickets.length,
                paidTickets: paidTickets.length,
                checkedIn: checkedIn.length,
                checkInRate: paidTickets.length > 0
                    ? ((checkedIn.length / paidTickets.length) * 100).toFixed(1) + '%'
                    : '0%',
                refunded: refunded.length,
                pending: pending.length,
                revenue: (paidRevenue + refundedAmount) / 100,
                refundedAmount: refundedAmount / 100,
                netRevenue: paidRevenue / 100,
            },
            attendees: paidTickets.map(t => ({
                name: t.name,
                email: t.email,
                phone: t.phone,
                checkedIn: t.checkedIn,
                checkedInAt: t.checkedInAt,
                purchasedAt: t.createdAt,
            })),
            generatedAt: new Date().toISOString(),
        };

        // Return as CSV if requested
        if (format === 'csv') {
            const headers = ['Name', 'Email', 'Phone', 'Checked In', 'Checked In At', 'Purchased At'];
            const rows = report.attendees.map(a => [
                a.name,
                a.email || '',
                a.phone || '',
                a.checkedIn ? 'Yes' : 'No',
                a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : '',
                new Date(a.purchasedAt).toLocaleString(),
            ]);

            const csvContent = [
                `Event Report: ${event.name}`,
                `Generated: ${new Date().toLocaleString()}`,
                '',
                `Total Tickets: ${report.summary.totalTickets}`,
                `Paid: ${report.summary.paidTickets}`,
                `Checked In: ${report.summary.checkedIn} (${report.summary.checkInRate})`,
                `Gross Revenue: ₹${report.summary.revenue.toLocaleString()}`,
                `Refunded Amount: ₹${report.summary.refundedAmount.toLocaleString()}`,
                `Net Revenue: ₹${report.summary.netRevenue.toLocaleString()}`,
                '',
                headers.join(','),
                ...rows.map(r => r.map(c => `"${c}"`).join(',')),
            ].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="event-report-${eventId}.csv"`,
                },
            });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        console.error('Report generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate report' },
            { status: 500 }
        );
    }
}
