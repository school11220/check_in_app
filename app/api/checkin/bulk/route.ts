import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getSession, hasEventAccess, hasRole, CHECKIN_ROLES } from '@/lib/auth';
import { generateAuditChecksum } from '@/lib/qr-security';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !hasRole(session.user.role, CHECKIN_ROLES)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const rateLimited = await enforceRateLimit(request, 'checkin-bulk', { requests: 20, window: '1 m' }, session.user.id);
        if (rateLimited) return rateLimited;

        const body = await request.json();
        const { ticketIds } = body;

        if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
            return NextResponse.json({ error: 'Ticket IDs array is required' }, { status: 400 });
        }

        const results: { ticketId: string; success: boolean; error?: string; name?: string }[] = [];
        for (const ticketId of ticketIds) {
            try {
                const ticket = await prisma.ticket.findUnique({
                    where: { id: ticketId },
                });

                if (!ticket) {
                    results.push({ ticketId, success: false, error: 'Ticket not found' });
                    continue;
                }

                if (!hasEventAccess(session, ticket.eventId)) {
                    results.push({ ticketId, success: false, error: 'No access to this event' });
                    continue;
                }

                if (ticket.status !== 'paid') {
                    results.push({ ticketId, success: false, error: 'Ticket not paid' });
                    continue;
                }

                if (ticket.checkedIn) {
                    results.push({ ticketId, success: false, error: 'Already checked in', name: ticket.name });
                    continue;
                }

                const timestamp = new Date();
                await prisma.$transaction([
                    prisma.ticket.update({
                        where: { id: ticketId },
                        data: {
                            checkedIn: true,
                            checkedInAt: timestamp,
                            checkedInBy: session.user.id,
                        },
                    }),
                    prisma.checkInLog.create({
                        data: {
                            ticketId,
                            eventId: ticket.eventId,
                            action: 'manual_checkin',
                            performedBy: session.user.id,
                            performedRole: session.user.role,
                            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                            userAgent: request.headers.get('user-agent') || 'unknown',
                            checksum: generateAuditChecksum(ticketId, 'manual_checkin', timestamp.toISOString(), session.user.id),
                            createdAt: timestamp,
                        },
                    }),
                ]);

                results.push({ ticketId, success: true, name: ticket.name });
            } catch (err: any) {
                results.push({ ticketId, success: false, error: err.message });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            totalProcessed: ticketIds.length,
            successful,
            failed,
            results,
        });
    } catch (error: any) {
        console.error('Bulk check-in error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process bulk check-in' },
            { status: 500 }
        );
    }
}
