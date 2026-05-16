import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { getTicketFinancials, PAID_LIKE_STATUSES } from '@/lib/ticket-lifecycle';

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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    if (!hasRole(session.user.role, ORGANIZER_ROLES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    if (eventId && !hasEventAccess(session, eventId)) {
      return NextResponse.json({ error: 'You do not have access to this event' }, { status: 403 });
    }

    const scopedEventIds = session.user.role === 'ADMIN' ? null : session.user.assignedEventIds || [];
    const eventScope = eventId
      ? { id: eventId }
      : scopedEventIds
        ? { id: { in: scopedEventIds } }
        : {};
    const ticketScope = eventId
      ? { eventId }
      : scopedEventIds
        ? { eventId: { in: scopedEventIds } }
        : {};

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const ticketWhere: any = { status: { in: [...PAID_LIKE_STATUSES] }, ...ticketScope };

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
      prisma.ticket.count({ where: { ...ticketScope, status: { in: ['refunded', 'partially_refunded'] } } }),

      // Time-based ticket counts
      prisma.ticket.count({ where: { ...ticketWhere, createdAt: { gte: todayStart } } }),
      prisma.ticket.count({ where: { ...ticketWhere, createdAt: { gte: weekStart } } }),
      prisma.ticket.count({ where: { ...ticketWhere, createdAt: { gte: monthStart } } }),

      // Event counts
      prisma.event.count({ where: eventScope }),
      prisma.event.count({ where: { ...eventScope, isActive: true } }),
      prisma.event.count({ where: { ...eventScope, date: { gte: now } } }),

      // Recent audit logs (last 20)
      prisma.auditLog.findMany({
        where: session.user.role === 'ADMIN' ? {} : { id: { in: [] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, action: true, resource: true, details: true, userName: true, userRole: true, createdAt: true },
      }),

      // Recent check-ins (last 10)
      prisma.ticket.findMany({
        where: { checkedIn: true, ...ticketScope },
        orderBy: { checkedInAt: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, checkedInAt: true, Event: { select: { name: true } } },
      }),

      // Top 5 events by ticket count
      prisma.event.findMany({
        where: eventScope,
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
    const revenueBreakdown = {
      revenueByEvent: [] as { eventId: string; name: string; revenue: number; tickets: number }[],
      revenueByDay: [] as { date: string; revenue: number }[],
      revenueByPaymentMethod: [] as { method: string; revenue: number }[],
      revenueByPromoCode: [] as { code: string; revenue: number }[],
      refundedAmount: 0,
      discountedAmount: 0,
    };

    try {
      const revenueData = await prisma.ticket.findMany({
        where: { status: { in: [...PAID_LIKE_STATUSES] }, ...ticketScope },
        select: {
          createdAt: true,
          eventId: true,
          status: true,
          amountPaid: true,
          grossAmount: true,
          discountAmount: true,
          refundedAmount: true,
          paymentMethod: true,
          razorpayPaymentId: true,
          promoCodeId: true,
          Event: { select: { id: true, name: true, price: true } },
        },
      });

      const revenueByEvent = new Map<string, { eventId: string; name: string; revenue: number; tickets: number }>();
      const revenueByDay = new Map<string, number>();
      const revenueByPaymentMethod = new Map<string, number>();
      const revenueByPromoCode = new Map<string, number>();
      let refundedAmount = 0;
      let discountedAmount = 0;

      for (const t of revenueData) {
        const price = getTicketFinancials(t, t.Event.price || 0).netAmount;
        totalRevenue += price;
        if (t.createdAt >= todayStart) todayRevenue += price;
        if (t.createdAt >= weekStart) weekRevenue += price;
        if (t.createdAt >= monthStart) monthRevenue += price;

        const eventRevenue = revenueByEvent.get(t.eventId) || { eventId: t.eventId, name: t.Event.name, revenue: 0, tickets: 0 };
        eventRevenue.revenue += price;
        eventRevenue.tickets += 1;
        revenueByEvent.set(t.eventId, eventRevenue);

        const day = t.createdAt.toISOString().slice(0, 10);
        revenueByDay.set(day, (revenueByDay.get(day) || 0) + price);
        const method = t.paymentMethod || (t.razorpayPaymentId ? 'razorpay' : 'unknown');
        revenueByPaymentMethod.set(method, (revenueByPaymentMethod.get(method) || 0) + price);
        revenueByPromoCode.set(t.promoCodeId || 'none', (revenueByPromoCode.get(t.promoCodeId || 'none') || 0) + price);
        refundedAmount += t.refundedAmount || 0;
        discountedAmount += t.discountAmount || 0;
      }

      revenueBreakdown.revenueByEvent = Array.from(revenueByEvent.values()).sort((a, b) => b.revenue - a.revenue);
      revenueBreakdown.revenueByDay = Array.from(revenueByDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue }));
      revenueBreakdown.revenueByPaymentMethod = Array.from(revenueByPaymentMethod.entries()).map(([method, revenue]) => ({ method, revenue }));
      revenueBreakdown.revenueByPromoCode = Array.from(revenueByPromoCode.entries()).map(([code, revenue]) => ({ code, revenue }));
      revenueBreakdown.refundedAmount = refundedAmount;
      revenueBreakdown.discountedAmount = discountedAmount;
    } catch { /* ignore revenue calc errors */ }

    // Check-in velocity - hourly breakdown for today
    let hourlyCheckins = new Array(24).fill(0);
    try {
      const todayCheckinLogs = await prisma.checkInLog.findMany({
        where: {
          createdAt: { gte: todayStart },
          action: { in: ['checkin', 'offline_checkin', 'manual_checkin'] },
          ...ticketScope,
        },
      });
      todayCheckinLogs.forEach((log: any) => {
        hourlyCheckins[new Date(log.createdAt).getHours()]++;
      });
    } catch { /* CheckInLog table may not exist */ }

    const topEventRevenue = new Map<string, number>();
    if (topEvents.length > 0) {
      const topEventTickets = await prisma.ticket.findMany({
        where: { status: { in: [...PAID_LIKE_STATUSES] }, eventId: { in: topEvents.map((event) => event.id) } },
        select: { eventId: true, status: true, amountPaid: true, grossAmount: true, discountAmount: true, refundedAmount: true, Event: { select: { price: true } } },
      });
      for (const ticket of topEventTickets) {
        topEventRevenue.set(
          ticket.eventId,
          (topEventRevenue.get(ticket.eventId) || 0) + getTicketFinancials(ticket, ticket.Event.price || 0).netAmount
        );
      }
    }

    const refundTickets = await prisma.ticket.findMany({
      where: { ...ticketScope, refundedAmount: { gt: 0 } },
      select: { createdAt: true, refundedAmount: true, status: true },
    });
    const refundByDay = new Map<string, number>();
    for (const ticket of refundTickets) {
      const day = ticket.createdAt.toISOString().slice(0, 10);
      refundByDay.set(day, (refundByDay.get(day) || 0) + ticket.refundedAmount);
    }

    const abandonedRegistrations = await prisma.ticket.count({
      where: {
        ...ticketScope,
        status: 'pending',
        createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });

    const failedPayments = await prisma.securityEvent.count({
      where: {
        type: { in: ['payment_failed', 'invalid_ticket_access', 'invalid_checkin_token'] },
        ...(eventId ? { eventId } : scopedEventIds ? { eventId: { in: scopedEventIds } } : {}),
        createdAt: { gte: weekStart },
      },
    }).catch(() => 0);

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
        discounted: revenueBreakdown.discountedAmount,
        refunded: revenueBreakdown.refundedAmount,
        byEvent: revenueBreakdown.revenueByEvent,
        byDay: revenueBreakdown.revenueByDay,
        byPaymentMethod: revenueBreakdown.revenueByPaymentMethod,
        byPromoCode: revenueBreakdown.revenueByPromoCode,
      },
      tickets: {
        total: totalTickets,
        checkedIn: checkedInTickets,
        refunded: refundedTickets,
        soldToday: todayTickets,
        soldThisWeek: weekTickets,
        soldThisMonth: monthTickets,
        abandoned: abandonedRegistrations,
        failedPaymentSignals: failedPayments,
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
        revenue: topEventRevenue.get(e.id) || 0,
        occupancy: e.capacity > 0 ? ((e.soldCount / e.capacity) * 100).toFixed(1) : '0',
        date: e.date,
      })),
      checkinVelocity: hourlyCheckins.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count,
      })),
      refunds: {
        total: refundTickets.reduce((sum, ticket) => sum + ticket.refundedAmount, 0),
        full: refundTickets.filter((ticket) => ticket.status === 'refunded').length,
        partial: refundTickets.filter((ticket) => ticket.status === 'partially_refunded').length,
        byDay: Array.from(refundByDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
