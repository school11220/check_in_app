import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');

    try {
        const whereClause = eventId ? { eventId } : {};
        const reviews = await prisma.review.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(reviews);
    } catch (error) {
        console.error('Failed to fetch reviews:', error);
        return NextResponse.json([], { status: 200 }); // Return empty array instead of 500 to prevent app crash
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, userName, rating, comment } = body;

        const review = await prisma.review.create({
            data: {
                eventId,
                userName,
                rating,
                comment,
            },
        });
        return NextResponse.json(review);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
