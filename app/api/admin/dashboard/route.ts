import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

async function getUserRole(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
  } catch { return 'UNAUTHORIZED'; }
}

/**
 * GET /api/admin/dashboard
 *
 * Returns comprehensive admin dashboard data:
 * - Revenue overview (total, today, this week, this month)
 * - Ticket metrics (sold, checked-in, refunded, conversion rate)
 * - Event metrics (active, upcoming, total)
 * - Recent activity feed (latest audit logs + check-ins)
 * - Top events by revenue
 * - Check-in velocity (hourly check-ins today)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const ticketWhere: any = { status: 'paid' };
    if (eventId) ticketWhere.eventId = eventId;

    // Parallel queries for performance
    const [
      totalTickets,
      checkedInTickets,
      refundedTickets,
      todayTickets,
      weekTickets,
      monthTickets,
      totalEvents,
      activeEvents,
      upcomingEvents,
      recentAuditLogs,
      recentCheckins,
      topEvents,
    ] = await Promise.all([
      // Ticket counts
      prisma.ticket.count({ where: ticketWhere }),
      prisma.ticket.count({ where: { ...ticketWhere, checkedIn: true } }),
      prisma.ticket.count({ where: { ...(eventId ? { eventId } : {}), status: 'refunded' } }),

      // Time-based ticket counts
      prisma.ticket.count({ where: { ...ticketWhere, createdAt: { gte: todayStart } } }),
      prisma.ticket.count({ where: { ...ticketWhere, createdAt: { gte: weekStart } } }),
      prisma.ticket.count({ where: { ...ticketWhere, createdAt: { gte: monthStart } } }),

      // Event counts
      prisma.event.count(),
      prisma.event.count({ where: { isActive: true } }),
      prisma.event.count({ where: { date: { gte: now } } }),

      // Recent audit logs (last 20)
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, action: true, resource: true, details: true, userName: true, userRole: true, createdAt: true },
      }),

      // Recent check-ins (last 10)
      prisma.ticket.findMany({
        where: { checkedIn: true, ...(eventId ? { eventId } : {}) },
        orderBy: { checkedInAt: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, checkedInAt: true, Event: { select: { name: true } } },
      }),

      // Top 5 events by ticket count
      prisma.event.findMany({
        orderBy: { soldCount: 'desc' },
        take: 5,
        select: { id: true, name: true, soldCount: true, capacity: true, price: true, date: true },
      }),
    ]);

    // Revenue calculations (aggregate ticket prices)
    let totalRevenue = 0;
    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;

    try {
      const revenueData = await prisma.ticket.findMany({
        where: { status: 'paid', ...(eventId ? { eventId } : {}) },
        select: { createdAt: true, Event: { select: { price: true } } },
      });

      for (const t of revenueData) {
        const price = t.Event.price || 0;
        totalRevenue += price;
        if (t.createdAt >= todayStart) todayRevenue += price;
        if (t.createdAt >= weekStart) weekRevenue += price;
        if (t.createdAt >= monthStart) monthRevenue += price;
      }
    } catch { /* ignore revenue calc errors */ }

    // Check-in velocity - hourly breakdown for today
    let hourlyCheckins = new Array(24).fill(0);
    try {
      const todayCheckinLogs = await prisma.checkInLog.findMany({
        where: {
          createdAt: { gte: todayStart },
          action: { in: ['checkin', 'offline_checkin', 'manual_checkin'] },
          ...(eventId ? { eventId } : {}),
        },
      });
      todayCheckinLogs.forEach((log: any) => {
        hourlyCheckins[new Date(log.createdAt).getHours()]++;
      });
    } catch { /* CheckInLog table may not exist */ }

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
      },
      tickets: {
        total: totalTickets,
        checkedIn: checkedInTickets,
        refunded: refundedTickets,
        soldToday: todayTickets,
        soldThisWeek: weekTickets,
        soldThisMonth: monthTickets,
        checkInRate: totalTickets > 0 ? ((checkedInTickets / totalTickets) * 100).toFixed(1) : '0',
      },
      events: {
        total: totalEvents,
        active: activeEvents,
        upcoming: upcomingEvents,
      },
      recentActivity: recentAuditLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        details: log.details,
        user: log.userName,
        role: log.userRole,
        time: log.createdAt,
      })),
      recentCheckins: recentCheckins.map((t: any) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        event: t.Event.name,
        checkedInAt: t.checkedInAt,
      })),
      topEvents: topEvents.map((e: any) => ({
        id: e.id,
        name: e.name,
        soldCount: e.soldCount,
        capacity: e.capacity,
        revenue: e.soldCount * (e.price || 0),
        occupancy: e.capacity > 0 ? ((e.soldCount / e.capacity) * 100).toFixed(1) : '0',
        date: e.date,
      })),
      checkinVelocity: hourlyCheckins.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
