import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { paginationMeta, parseCursorPagination, parsePagination } from '@/lib/pagination';
import { apiErrorResponse } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return apiErrorResponse('Authentication required', 401);
        }
        if (!hasRole(session.user.role, ORGANIZER_ROLES)) {
            return apiErrorResponse('Insufficient permissions', 403);
        }

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');
        const paginated = searchParams.has('page') || searchParams.has('pageSize');
        const cursorMode = searchParams.has('cursor');
        const cursorParams = parseCursorPagination(searchParams);
        const { page, pageSize, skip } = parsePagination(searchParams);
        const q = (searchParams.get('q') || '').trim();
        const status = (searchParams.get('status') || '').trim();
        const checkedIn = (searchParams.get('checkedIn') || '').trim();

        if (eventId && !hasEventAccess(session, eventId)) {
            return apiErrorResponse('You do not have access to this event', 403);
        }

        const scope: any = eventId
            ? { eventId }
            : session.user.role === 'ADMIN'
                ? {}
                : { eventId: { in: session.user.assignedEventIds || [] } };

        const where: any = {
            ...scope,
            ...(q ? { OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
                { id: { contains: q, mode: 'insensitive' } },
            ] } : {}),
            ...(status === 'checked_in' ? { checkedIn: true } : status && status !== 'all' ? { status } : {}),
            ...(checkedIn === 'true' ? { checkedIn: true } : checkedIn === 'false' ? { checkedIn: false } : {}),
        };
        const [tickets, total] = await Promise.all([prisma.ticket.findMany({
            where,
            include: { Event: true },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            ...(cursorMode ? { take: cursorParams.pageSize + 1, ...(cursorParams.cursor ? { cursor: { id: cursorParams.cursor }, skip: 1 } : {}) } : paginated ? { skip, take: pageSize } : {}),
        }), cursorMode ? Promise.resolve(0) : paginated ? prisma.ticket.count({ where }) : Promise.resolve(0)]);
        const items = cursorMode ? tickets.slice(0, cursorParams.pageSize) : tickets;
        return NextResponse.json(cursorMode ? { items, pagination: { pageSize: cursorParams.pageSize, nextCursor: tickets.length > cursorParams.pageSize ? tickets[cursorParams.pageSize].id : null } } : paginated ? { items, pagination: paginationMeta(page, pageSize, total) } : tickets);
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        return apiErrorResponse('Failed to fetch tickets', 500);
    }
}
