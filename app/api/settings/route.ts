import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasRole, ADMIN_ROLES } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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
        const session = await getSession();
        if (!session || !hasRole(session.user.role, ADMIN_ROLES)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

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

        await logAudit({
            action: 'SETTINGS_UPDATE',
            resource: 'SETTINGS',
            resourceId: 'default',
            details: {
                updatedKeys: [
                    siteSettings ? 'siteSettings' : null,
                    emailTemplates ? 'emailTemplates' : null,
                    surveys ? 'surveys' : null,
                ].filter(Boolean),
            },
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userRole: session.user.role,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
