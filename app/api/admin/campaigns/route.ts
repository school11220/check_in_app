/**
 * Drip Campaign CRUD — stores campaign configs in SiteConfig.settings.campaigns.
 * A separate /api/admin/campaigns/process route triggers actual sending
 * (meant to be called by a cron job, vercel cron, or a manual "Run now" button).
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

type SiteSettings = Record<string, unknown> & {
    campaigns?: unknown[];
};

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) || '';
    return role === 'ADMIN' ? userId : null;
}

function asSettings(value: unknown): SiteSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as SiteSettings;
}

async function readSettings() {
    const config = await prisma.siteConfig.findUnique({
        where: { id: 'default' },
        select: { settings: true },
    });
    return asSettings(config?.settings);
}

async function writeSettings(settings: SiteSettings) {
    const jsonSettings = settings as Prisma.InputJsonObject;
    await prisma.siteConfig.upsert({
        where: { id: 'default' },
        update: { settings: jsonSettings, updatedAt: new Date() },
        create: {
            id: 'default',
            settings: jsonSettings,
            templates: [],
            surveys: [],
            updatedAt: new Date(),
        },
    });
}

export async function GET() {
    const uid = await requireAdmin();
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await readSettings();
    const campaigns = Array.isArray(settings.campaigns) ? settings.campaigns : [];
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

    const settings = await readSettings();
    const existing = Array.isArray(settings.campaigns) ? settings.campaigns : [];

    const newCampaign = {
        id: `campaign-${crypto.randomUUID()}`,
        name,
        eventId,
        steps, // Array of { triggerType: 'register'|'daysBeforeEvent'|'daysAfterEvent', offsetDays: number, templateId: string }
        isActive: isActive ?? true,
        createdAt: new Date().toISOString(),
    };

    const updated = [newCampaign, ...existing];

    await writeSettings({ ...settings, campaigns: updated });

    return NextResponse.json(newCampaign, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    const uid = await requireAdmin();
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const settings = await readSettings();
    const existing = Array.isArray(settings.campaigns) ? settings.campaigns : [];
    const updated = existing.map((campaign: any) => campaign.id === id ? { ...campaign, ...updates } : campaign);

    await writeSettings({ ...settings, campaigns: updated });
    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const uid = await requireAdmin();
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const settings = await readSettings();
    const existing = Array.isArray(settings.campaigns) ? settings.campaigns : [];
    const updated = existing.filter((campaign: any) => campaign.id !== id);

    await writeSettings({ ...settings, campaigns: updated });
    return NextResponse.json({ success: true });
}
