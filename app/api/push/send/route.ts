import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respond, parseBody } from '@/lib/api-helpers';
import { pushSendBody } from '@/lib/api-helpers/schemas';
import { sendWebPush } from '@/lib/web-push';

export const POST = respond(
    async (request: NextRequest) => {
        const data = await parseBody(request, pushSendBody);
        const subs = await prisma.pushSubscription.findMany();
        const payload = JSON.stringify({ title: data.title, body: data.body, url: data.url ?? '/' });
        const results = await Promise.allSettled(
            subs.map((s) => sendWebPush(s, payload)),
        );
        return NextResponse.json({
            sent: results.filter((r) => r.status === 'fulfilled').length,
            failed: results.filter((r) => r.status === 'rejected').length,
            total: subs.length,
        });
    },
    { auth: 'admin' },
);
