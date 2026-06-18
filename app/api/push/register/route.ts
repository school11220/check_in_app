import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

interface PushBody {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as PushBody;
        if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
            return NextResponse.json({ error: 'endpoint, keys.p256dh and keys.auth are required' }, { status: 400 });
        }
        const session = await getSession().catch(() => null);
        const userId = session?.user?.id || null;
        const userAgent = body.userAgent || request.headers.get('user-agent') || 'unknown';

        // Upsert by endpoint so re-subscribes update auth keys
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
    } catch (err) {
        console.error('Push register error:', err);
        return NextResponse.json({ error: 'Failed to register subscription' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { endpoint } = await request.json();
        if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
        await prisma.pushSubscription.deleteMany({ where: { endpoint } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}
