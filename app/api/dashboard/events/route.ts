import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasRole, CHECKIN_ROLES } from '@/lib/auth';
import { EVENT_WITH_PRICING_SELECT } from '@/lib/event-select';
import { calculateDynamicPrice } from '@/lib/pricing';
import { paginationMeta, parsePagination } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!hasRole(session.user.role, CHECKIN_ROLES)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const { page, pageSize, skip } = parsePagination(searchParams, { page: 1, pageSize: 50 });
  const q = (searchParams.get('q') || '').trim();
  const assigned = session.user.assignedEventIds || [];
  const where = {
    ...(session.user.role === 'ADMIN' ? {} : { id: { in: assigned } }),
    ...(q ? { OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { venue: { contains: q, mode: 'insensitive' as const } },
    ] } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.event.findMany({ where, select: EVENT_WITH_PRICING_SELECT, orderBy: { date: 'asc' }, skip, take: pageSize }),
    prisma.event.count({ where }),
  ]);
  const items = rows.map((event) => ({ ...event, currentPrice: calculateDynamicPrice(event) }));
  return NextResponse.json({ items, pagination: paginationMeta(page, pageSize, total) });
}
