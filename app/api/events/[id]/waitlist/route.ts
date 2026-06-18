import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { respond, parseBody, notFound } from '@/lib/api-helpers';
import { waitlistBody } from '@/lib/api-helpers/schemas';

// Public endpoint: add yourself to the waitlist
export const POST = respond(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const { id: eventId } = await params;
        const data = await parseBody(request, waitlistBody);

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, name: true },
        });
        if (!event) throw notFound('Event not found');

        // Prevent duplicate waiting entries for the same email/event
        const existing = await prisma.waitlistEntry.findFirst({
            where: { eventId, email: data.email, status: 'waiting' },
        });
        if (existing) {
            return NextResponse.json({ entry: existing, deduped: true });
        }

        const entry = await prisma.waitlistEntry.create({
            data: {
                eventId,
                name: data.name,
                email: data.email,
                phone: data.phone ?? null,
                ticketCount: data.ticketCount,
                status: 'waiting',
            },
        });

        return NextResponse.json({ entry });
    },
    { public: true },
);

// Authenticated: list waitlist entries for an event
export const GET = respond(
    async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const { id: eventId } = await params;
        const entries = await prisma.waitlistEntry.findMany({
            where: { eventId },
            orderBy: { createdAt: 'asc' },
        });
        return NextResponse.json(entries);
    },
    { auth: 'organizer' },
);
