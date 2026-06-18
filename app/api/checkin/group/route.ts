import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, CHECKIN_ROLES } from '@/lib/auth';
import { isPaidLikeStatus } from '@/lib/ticket-lifecycle';
import { generateAuditChecksum } from '@/lib/qr-security';
import { respond, parseBody, badRequest, forbidden, notFound, conflict } from '@/lib/api-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
    purchaseGroupId: z.string().min(1).max(200),
    reason: z.string().max(500).optional(),
});

/**
 * POST /api/checkin/group
 *
 * Check in every member of a group registration in one call. The scanner
 * is expected to be the lead attendee's QR; the server finds all tickets
 * with the same purchaseGroupId and marks each one as checked-in,
 * skipping any that are already in.
 */
export const POST = respond(
    async (req: NextRequest) => {
        const body = await parseBody(req, BodySchema);
        const session = await getSession();
        if (!session) {
            throw forbidden('Authentication required');
        }
        if (!hasRole(session.user.role, CHECKIN_ROLES)) {
            throw forbidden('Scanner role required');
        }

        const group = await prisma.groupRegistration.findUnique({
            where: { purchaseGroupId: body.purchaseGroupId },
        });
        if (!group) {
            throw notFound('Group not found');
        }
        if (!hasEventAccess(session, group.eventId)) {
            throw forbidden('You do not have access to this event');
        }
        if (!isPaidLikeStatus(group.status)) {
            throw conflict(`Group is ${group.status}; only paid groups can be checked in`);
        }

        const tickets = await prisma.ticket.findMany({
            where: { eventId: group.eventId, customAnswers: { path: ['purchaseGroupId'], equals: body.purchaseGroupId } as any },
        });

        // Fall back: if the new schema isn't used everywhere, also try the
        // existing convention of grouping by primary email + createdAt minute.
        let memberTickets = tickets;
        if (memberTickets.length === 0) {
            memberTickets = await prisma.ticket.findMany({
                where: {
                    eventId: group.eventId,
                    email: group.primaryEmail,
                    createdAt: {
                        gte: new Date(group.createdAt.getTime() - 5 * 60 * 1000),
                        lte: new Date(group.createdAt.getTime() + 5 * 60 * 1000),
                    },
                },
                orderBy: { createdAt: 'asc' },
                take: Math.max(group.memberCount, 10),
            });
        }

        if (memberTickets.length === 0) {
            throw notFound('No tickets found for this group');
        }

        const results: Array<{ id: string; name: string; ok: boolean; reason?: string }> = [];
        for (const t of memberTickets) {
            if (t.checkedIn) {
                results.push({ id: t.id, name: t.name, ok: false, reason: 'Already checked in' });
                continue;
            }
            if (!isPaidLikeStatus(t.status)) {
                results.push({ id: t.id, name: t.name, ok: false, reason: `Ticket is ${t.status}` });
                continue;
            }
            try {
                await prisma.ticket.update({
                    where: { id: t.id },
                    data: { checkedIn: true, checkedInAt: new Date() },
                });
                await prisma.checkInLog.create({
                    data: {
                        ticketId: t.id,
                        eventId: t.eventId,
                        action: 'checkin',
                        performedBy: session.user.id,
                        performedRole: session.user.role,
                        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
                        userAgent: req.headers.get('user-agent') || 'unknown',
                        checksum: generateAuditChecksum(t.id, 'checkin', new Date().toISOString(), session.user.id),
                    },
                });
                results.push({ id: t.id, name: t.name, ok: true });
            } catch (err) {
                results.push({ id: t.id, name: t.name, ok: false, reason: (err as Error).message });
            }
        }

        const okCount = results.filter((r) => r.ok).length;
        return NextResponse.json({
            group: { id: group.id, purchaseGroupId: group.purchaseGroupId, memberCount: group.memberCount },
            total: results.length,
            succeeded: okCount,
            failed: results.length - okCount,
            results,
        });
    },
    { auth: 'scanner' },
);
