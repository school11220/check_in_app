import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respond, parseBody, badRequest } from '@/lib/api-helpers';
import { z } from 'zod';
import { sendTransactionalEmail, isEmailConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';

const ListQuery = z.object({
    eventId: z.string().optional(),
    ticketId: z.string().optional(),
    unreadOnly: z.union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')]).optional(),
    threadKey: z.string().optional(),
});

const IngestSchema = z.object({
    fromEmail: z.string().email(),
    fromName: z.string().optional(),
    toEmail: z.string().email().optional(),
    subject: z.string().min(1).max(500),
    body: z.string().min(1).max(50000),
    ticketId: z.string().optional(),
    eventId: z.string().optional(),
    threadKey: z.string().optional(),
});

const ReplySchema = z.object({
    threadKey: z.string().min(1),
    toEmail: z.string().email(),
    subject: z.string().min(1).max(500),
    body: z.string().min(1).max(50000),
    ticketId: z.string().optional(),
    eventId: z.string().optional(),
});

const MarkReadSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(500),
});

/**
 * GET /api/admin/messages
 *
 * Lists messages. With `threadKey`, returns the full thread.
 * Default: returns most recent message per thread for an inbox-style view.
 */
export const GET = respond(async (req: NextRequest) => {
    const url = new URL(req.url);
    const params = ListQuery.parse({
        eventId: url.searchParams.get('eventId') || undefined,
        ticketId: url.searchParams.get('ticketId') || undefined,
        unreadOnly: url.searchParams.get('unreadOnly') || undefined,
        threadKey: url.searchParams.get('threadKey') || undefined,
    });

    if (params.threadKey) {
        const msgs = await prisma.attendeeMessage.findMany({
            where: { threadKey: params.threadKey },
            orderBy: { receivedAt: 'asc' },
        });
        return NextResponse.json({ thread: params.threadKey, messages: msgs });
    }

    const where: any = { isInbound: true };
    if (params.eventId) where.eventId = params.eventId;
    if (params.ticketId) where.ticketId = params.ticketId;
    if (params.unreadOnly === '1' || params.unreadOnly === 'true') where.isRead = false;

    // Inbox view: one row per thread, latest message wins
    const all = await prisma.attendeeMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: 200,
    });
    const seen = new Set<string>();
    const threads = all.filter((m) => {
        if (seen.has(m.threadKey)) return false;
        seen.add(m.threadKey);
        return true;
    });

    const unread = await prisma.attendeeMessage.count({
        where: { ...where, isRead: false },
    });

    return NextResponse.json({ threads, unread });
}, { auth: 'admin' });

/**
 * POST /api/admin/messages
 *
 * Ingest an inbound message (called by the email-webhook handler in production)
 * or reply to a thread (action=reply).
 */
export const POST = respond(async (req: NextRequest) => {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'reply') {
        const body = await parseBody(req, ReplySchema);
        if (!isEmailConfigured()) {
            throw badRequest('Email is not configured on this server');
        }
        const sent = await sendTransactionalEmail({
            to: body.toEmail,
            subject: body.subject.startsWith('Re:') ? body.subject : `Re: ${body.subject}`,
            htmlContent: body.body.replace(/\n/g, '<br/>'),
            textContent: body.body,
        });
        if (!sent.success) {
            throw badRequest(sent.error || 'Failed to send email');
        }
        await prisma.attendeeMessage.create({
            data: {
                threadKey: body.threadKey,
                ticketId: body.ticketId,
                eventId: body.eventId,
                fromEmail: process.env.SENDER_EMAIL || 'organizer@eventhub.com',
                fromName: 'Organizer',
                toEmail: body.toEmail,
                subject: body.subject,
                body: body.body,
                isInbound: false,
            },
        });
        return NextResponse.json({ success: true });
    }

    // Default: ingest
    const body = await parseBody(req, IngestSchema);
    const ticket = body.ticketId
        ? await prisma.ticket.findUnique({ where: { id: body.ticketId } })
        : null;
    const threadKey = body.threadKey || (ticket ? `tkt-${body.ticketId}` : `email-${body.fromEmail}-${(body.subject || '').slice(0, 40)}`);
    const created = await prisma.attendeeMessage.create({
        data: {
            threadKey,
            ticketId: body.ticketId,
            eventId: body.eventId || ticket?.eventId,
            fromEmail: body.fromEmail,
            fromName: body.fromName,
            toEmail: body.toEmail || process.env.SENDER_EMAIL || 'organizer@eventhub.com',
            subject: body.subject,
            body: body.body,
            isInbound: true,
        },
    });
    return NextResponse.json({ success: true, id: created.id, threadKey });
}, { auth: 'admin' });

/**
 * PATCH /api/admin/messages  — mark messages read.
 */
export const PATCH = respond(async (req: NextRequest) => {
    const body = await parseBody(req, MarkReadSchema);
    const result = await prisma.attendeeMessage.updateMany({
        where: { id: { in: body.ids } },
        data: { isRead: true },
    });
    return NextResponse.json({ updated: result.count });
}, { auth: 'admin' });
