/**
 * Drip Campaign CRUD — stores campaign configs in SiteConfig.campaigns JSON array.
 * A separate /api/admin/campaigns/process route triggers actual sending
 * (meant to be called by a cron job, vercel cron, or a manual "Run now" button).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) || '';
    return role === 'ADMIN' ? userId : null;
}

export async function GET() {
    const uid = await requireAdmin();
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    const campaigns = (config as any)?.campaigns ?? [];
    return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
    const uid = await requireAdmin();
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, eventId, steps, isActive } = body;

    if (!name || !eventId || !Array.isArray(steps)) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    const existing: any[] = (config as any)?.campaigns ?? [];

    const newCampaign = {
        id: `campaign-${Date.now()}`,
        name,
        eventId,
        steps, // Array of { triggerType: 'register'|'daysBeforeEvent'|'daysAfterEvent', offsetDays: number, templateId: string }
        isActive: isActive ?? true,
        createdAt: new Date().toISOString(),
    };

    const updated = [newCampaign, ...existing];

    await prisma.siteConfig.upsert({
        where: { id: 'default' },
        update: { campaigns: updated } as any,
        create: { id: 'default', campaigns: updated } as any,
    });

    return NextResponse.json(newCampaign, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    const uid = await requireAdmin();
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    const existing: any[] = (config as any)?.campaigns ?? [];
    const updated = existing.map((c: any) => c.id === id ? { ...c, ...updates } : c);

    await prisma.siteConfig.update({ where: { id: 'default' }, data: { campaigns: updated } as any });
    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const uid = await requireAdmin();
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    const existing: any[] = (config as any)?.campaigns ?? [];
    const updated = existing.filter((c: any) => c.id !== id);

    await prisma.siteConfig.update({ where: { id: 'default' }, data: { campaigns: updated } as any });
    return NextResponse.json({ success: true });
}
