import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respond, parseBody } from '@/lib/api-helpers';
import { reviewBody } from '@/lib/api-helpers/schemas';

export const dynamic = 'force-dynamic';

export const GET = respond(
    async (request: NextRequest) => {
        const url = new URL(request.url);
        const eventId = url.searchParams.get('eventId');
        const reviews = await prisma.review.findMany({
            where: eventId ? { eventId } : {},
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(reviews);
    },
    { public: true },
);

export const POST = respond(
    async (request: NextRequest) => {
        const data = await parseBody(request, reviewBody);
        const review = await prisma.review.create({
            data: {
                id: crypto.randomUUID(),
                Event: { connect: { id: data.eventId } },
                userName: data.name,
                rating: data.rating,
                comment: data.comment,
            },
        });
        return NextResponse.json(review);
    },
    { public: true },
);
