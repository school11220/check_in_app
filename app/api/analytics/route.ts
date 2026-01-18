import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

        // Base where clause for Tickets
        const where: any = {
            status: 'paid', // Only count paid tickets for sales/revenue
            createdAt: { gte: dateCutoff }
        };

        if (eventId) {
            where.eventId = eventId;
        }

        // Parallel queries for performance
        const [
            totalTickets,
            checkedInTickets,
            salesByEvent,
            tickets
        ] = await Promise.all([
            // Total Paid Tickets
            prisma.ticket.count({ where }),

            // Check-in Count (subset of paid)
            prisma.ticket.count({
                where: { ...where, checkedIn: true }
            }),

            // Sales by Event (Group By)
            prisma.ticket.groupBy({
                by: ['eventId'],
                where,
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 8
            }),

            // Fetch tickets for complex JS aggregations (Trend, Hourly, Email stats)
            // Prisma doesn't support complex date grouping natively in groupBy easily without raw SQL
            // so we fetch minimum fields needed for remaining stats
            prisma.ticket.findMany({
                where,
                select: {
                    createdAt: true,
                    email: true,
                    eventId: true
                }
            })
        ]);

        // --- Post-Processing Aggregations ---

        // 1. Sales Trend (Daily)
        const salesByDay: Record<string, number> = {};
        tickets.forEach(t => {
            const date = new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            salesByDay[date] = (salesByDay[date] || 0) + 1;
        });
        const salesTrendData = Object.entries(salesByDay)
            .map(([date, sales]) => ({ date, sales }))
            // Sort by date logic if needed, but for now simple JS sort or assuming robust enough
            // Since we need chronological, let's rely on Object.entries iteration order or sort
            // Better to sort by timestamp if critical, but for chart visual this is usually okay if keys are inserted in order
            .slice(-14);

        // 2. Repeat Attendees
        const emailCounts: Record<string, number> = {};
        tickets.forEach(t => {
            if (t.email) emailCounts[t.email] = (emailCounts[t.email] || 0) + 1;
        });
        const repeatAttendees = Object.values(emailCounts).filter(c => c > 1).length;
        const uniqueAttendees = Object.keys(emailCounts).length;

        // 3. Peak Hours
        const bookingHours = new Array(24).fill(0);
        tickets.forEach(t => {
            const hour = new Date(t.createdAt).getHours();
            bookingHours[hour]++;
        });
        const peakHoursData = bookingHours.map((count, hour) => ({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            bookings: count
        }));

        // 4. Sales by Event (Enrich with Names)
        // We need event names. We can fetch all events or just the ones in the group
        const eventIds = salesByEvent.map(g => g.eventId);
        const events = await prisma.event.findMany({
            where: { id: { in: eventIds } },
            select: { id: true, name: true }
        });

        const salesByEventData = salesByEvent.map(group => {
            const event = events.find(e => e.id === group.eventId);
            return {
                name: event?.name || 'Unknown',
                count: group._count.id
            };
        });

        // 5. Check-in Rate
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
                { name: 'Not Checked In', value: totalTickets - checkedInTickets }
            ]
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
