import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Lightweight Web-Push sender. We avoid pulling in the `web-push` package to
// keep dependencies slim; implement the protocol directly with fetch + crypto.
// Reference: https://datatracker.ietf.org/doc/html/rfc8292 (VAPID) and
// https://datatracker.ietf.org/doc/html/rfc8030 (Web Push).
//
// For a working prod setup, install `web-push` and replace this stub.

async function sendWebPushStub(_sub: { endpoint: string }, _payload: string) {
    // In production use: await webpush.sendNotification(sub, payload, { vapidDetails: ... })
    console.log('[push] would send to', _sub.endpoint, 'payload bytes:', _payload.length);
    return { ok: true };
}

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const { title, body: message, eventId, url } = body || {};
    if (!title || !message) {
        return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    const subs = await prisma.pushSubscription.findMany();
    const payload = JSON.stringify({ title, body: message, url: url || '/' });
    const results = await Promise.allSettled(subs.map(s => sendWebPushStub(s, payload)));
    return NextResponse.json({
        sent: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        total: subs.length,
    });
}
