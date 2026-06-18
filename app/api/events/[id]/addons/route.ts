import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasEventAccess, getSession } from '@/lib/auth';
import { respond, badRequest, parseBody } from '@/lib/api-helpers';
import { addOnBody } from '@/lib/api-helpers/schemas';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await params;
    const addons = await prisma.addOn.findMany({
        where: { eventId, isActive: true },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(addons);
}

export const POST = respond(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const { id: eventId } = await params;
        const session = await getSession();
        if (!hasEventAccess(session!, eventId)) {
            throw badRequest('Forbidden');
        }
        const data = await parseBody(request, addOnBody);
        const addon = await prisma.addOn.create({
            data: {
                eventId,
                name: data.name,
                description: data.description ?? null,
                priceInPaise: data.priceInPaise,
                currency: data.currency,
                maxQuantity: data.maxQuantity,
                imageUrl: data.imageUrl || null,
            },
        });
        return NextResponse.json(addon);
    },
);
