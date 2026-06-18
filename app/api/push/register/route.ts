import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { respond, parseBody } from '@/lib/api-helpers';
import { pushRegisterBody } from '@/lib/api-helpers/schemas';

const deleteBody = z.object({ endpoint: z.string().url().max(2000) });

export const POST = respond(
    async (request: NextRequest) => {
        const body = await parseBody(request, pushRegisterBody);
        const session = await getSession().catch(() => null);
        const userId = session?.user?.id ?? null;
        const userAgent = body.userAgent ?? request.headers.get('user-agent') ?? 'unknown';

        const sub = await prisma.pushSubscription.upsert({
            where: { endpoint: body.endpoint },
            create: {
                endpoint: body.endpoint,
                p256dh: body.keys.p256dh,
                auth: body.keys.auth,
                userId,
                userAgent,
            },
            update: {
                p256dh: body.keys.p256dh,
                auth: body.keys.auth,
                userId,
                userAgent,
                lastUsedAt: new Date(),
            },
        });
        return NextResponse.json({ ok: true, id: sub.id });
    },
    { public: true },
);

export const DELETE = respond(
    async (request: NextRequest) => {
        const { endpoint } = await parseBody(request, deleteBody);
        await prisma.pushSubscription.deleteMany({ where: { endpoint } });
        return NextResponse.json({ ok: true });
    },
    { public: true },
);
