import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SiteSettings, EmailTemplate } from '@/lib/store';

export async function GET() {
    try {
        const config = await prisma.siteConfig.findUnique({
            where: { id: 'default' }
        });

        if (!config) return NextResponse.json(null);

        return NextResponse.json({
            siteSettings: config.settings,
            emailTemplates: config.templates,
            surveys: config.surveys
        });
    } catch (error) {
        console.error('Failed to read settings:', error);
        return NextResponse.json(null);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { siteSettings, emailTemplates, surveys } = body;

        // Need to fetch existing config first to merge if only partial data sent,
        // although currently the frontend sends everything.
        // But let's be safe and assume we might need to merge or create defaults.

        await prisma.siteConfig.upsert({
            where: { id: 'default' },
            create: {
                id: 'default',
                settings: siteSettings || {},
                templates: emailTemplates || [],
                surveys: surveys || [],
                updatedAt: new Date()
            },
            update: {
                settings: siteSettings || undefined,
                templates: emailTemplates || undefined,
                surveys: surveys || undefined
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
