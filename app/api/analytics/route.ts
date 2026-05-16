import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PAID_LIKE_STATUSES } from '@/lib/ticket-lifecycle';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const timeRange = searchParams.get('timeRange') || '30d';
        const eventId = searchParams.get('eventId');

        // Calculate date cutoff
        let dateCutoff = new Date();
        if (timeRange === '7d') dateCutoff.setDate(dateCutoff.getDate() - 7);
        else if (timeRange === '30d') dateCutoff.setDate(dateCutoff.getDate() - 30);
        else if (timeRange === '90d') dateCutoff.setDate(dateCutoff.getDate() - 90);
        else if (timeRange === 'all') dateCutoff = new Date(0); // Epoch

        const baseWhere: any = {
            createdAt: { gte: dateCutoff },
        };
        if (eventId) baseWhere.eventId = eventId;

        const [ticketsForRange, salesByEvent, fraudAttemptsRaw] = await Promise.all([
            prisma.ticket.findMany({
                where: baseWhere,
                select: { createdAt: true, email: true, eventId: true, status: true, checkedIn: true },
            }),
            prisma.ticket.groupBy({
                by: ['eventId'],
                where: { ...baseWhere, status: { in: [...PAID_LIKE_STATUSES] } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 8,
            }),
            prisma.checkInLog.findMany({
                where: {
                    action: { in: ['duplicate_attempt', 'replay_detected'] },
                    ...(eventId ? { eventId } : {}),
                    createdAt: { gte: dateCutoff },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: { ticket: { select: { name: true, email: true } } },
            }).catch(() => [] as any[]),
        ]);

        const paidTickets = ticketsForRange.filter(t => PAID_LIKE_STATUSES.includes(t.status as any));
        const checkedInTickets = paidTickets.filter(t => t.checkedIn).length;
        const totalTickets = paidTickets.length;

        const funnel = {
            created: ticketsForRange.length,
            pending: ticketsForRange.filter(t => t.status === 'pending').length,
            paid: paidTickets.length,
            cancelled: ticketsForRange.filter(t => t.status === 'cancelled').length,
            refunded: ticketsForRange.filter(t => t.status === 'refunded').length,
            checkedIn: checkedInTickets,
        };

        const dropOff = {
            paymentConversion: funnel.created ? Number(((funnel.paid / funnel.created) * 100).toFixed(1)) : 0,
            checkInConversion: funnel.paid ? Number(((funnel.checkedIn / funnel.paid) * 100).toFixed(1)) : 0,
            abandonmentRate: funnel.created ? Number(((((funnel.pending + funnel.cancelled + funnel.refunded) / funnel.created) * 100)).toFixed(1)) : 0,
        };

        const salesByDay: Record<string, number> = {};
        paidTickets.forEach(t => {
            const date = new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            salesByDay[date] = (salesByDay[date] || 0) + 1;
        });
        const salesTrendData = Object.entries(salesByDay)
            .map(([date, sales]) => ({ date, sales }))
            .slice(-14);

        const emailCounts: Record<string, number> = {};
        paidTickets.forEach(t => {
            if (t.email) emailCounts[t.email] = (emailCounts[t.email] || 0) + 1;
        });
        const repeatAttendees = Object.values(emailCounts).filter(c => c > 1).length;
        const uniqueAttendees = Object.keys(emailCounts).length;

        const bookingHours = new Array(24).fill(0);
        paidTickets.forEach(t => {
            const hour = new Date(t.createdAt).getHours();
            bookingHours[hour]++;
        });
        const peakHoursData = bookingHours.map((count, hour) => ({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            bookings: count,
        }));

        const eventIds = Array.from(new Set([
            ...salesByEvent.map(g => g.eventId),
            ...fraudAttemptsRaw.map(f => f.eventId),
        ]));

        const events = eventIds.length
            ? await prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true } })
            : [];
        const eventNameMap = new Map(events.map(e => [e.id, e.name]));

        const salesByEventData = salesByEvent.map(group => ({
            name: eventNameMap.get(group.eventId) || 'Unknown',
            count: group._count.id,
        }));

        const fraudWatch = {
            attempts: fraudAttemptsRaw.length,
            recent: fraudAttemptsRaw.map(log => ({
                id: log.id,
                ticketId: log.ticketId,
                eventId: log.eventId,
                eventName: eventNameMap.get(log.eventId) || 'Unknown',
                action: log.action,
                performedBy: log.performedBy,
                at: log.createdAt,
                attendee: log.ticket?.name || 'Unknown',
                email: log.ticket?.email,
            })),
        };

        const checkInRate = totalTickets > 0 ? ((checkedInTickets / totalTickets) * 100).toFixed(1) : '0';

        return NextResponse.json({
            totalTickets,
            checkedInTickets,
            checkInRate,
            repeatAttendees,
            uniqueAttendees,
            salesByEventData,
            salesTrendData,
            peakHoursData,
            checkInData: [
                { name: 'Checked In', value: checkedInTickets },
                { name: 'Not Checked In', value: totalTickets - checkedInTickets },
            ],
            funnel,
            dropOff,
            fraudWatch,
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
