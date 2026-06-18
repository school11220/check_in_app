import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasEventAccess, getSession } from '@/lib/auth';
import { respond, parseBody, notFound, conflict, forbidden } from '@/lib/api-helpers';
import { groupRegistrationBody } from '@/lib/api-helpers/schemas';

// Create a group registration (purchase-group of N tickets under one payment)
export const POST = respond(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const { id: eventId } = await params;
        const data = await parseBody(request, groupRegistrationBody);
        const count = data.memberCount;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, name: true, price: true, capacity: true, soldCount: true, entryFee: true },
        });
        if (!event) throw notFound('Event not found');

        if (event.soldCount + count > event.capacity) {
            throw conflict('Not enough capacity');
        }

        const purchaseGroupId = `grp-${crypto.randomUUID()}`;
        const unitPrice = event.entryFee || event.price;
        const totalAmount = unitPrice * count;

        const group = await prisma.groupRegistration.create({
            data: {
                eventId,
                purchaseGroupId,
                primaryName: data.primaryName,
                primaryEmail: data.primaryEmail,
                primaryPhone: data.primaryPhone ?? null,
                memberCount: count,
                totalAmount,
                status: 'pending',
            },
        });

        return NextResponse.json({ group });
    },
    { public: true },
);

export const GET = respond(
    async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const { id: eventId } = await params;
        const session = await getSession();
        if (!hasEventAccess(session!, eventId)) throw forbidden();
        const groups = await prisma.groupRegistration.findMany({
            where: { eventId },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(groups);
    },
);
