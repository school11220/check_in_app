import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respond } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export const GET = respond(
    async (_req: NextRequest) => {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit to last 100 for now
        });
        return NextResponse.json(logs);
    },
    { auth: 'admin' },
);
