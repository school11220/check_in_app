import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respond, parseBody, notFound } from '@/lib/api-helpers';
import { z } from 'zod';
import { getSession, hasRole, ADMIN_ROLES } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TemplateSchema = z.object({
    id: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    type: z.string().min(1).max(50),
    subject: z.string().min(1).max(500),
    body: z.string().min(1).max(50000),
    isActive: z.boolean().default(true),
});

const PutBodySchema = z.object({
    templates: z.array(TemplateSchema).max(500),
});

const DeleteBodySchema = z.object({
    id: z.string().min(1).max(200),
});

async function getConfig() {
    return prisma.siteConfig.findUnique({ where: { id: 'default' } });
}

async function updateTemplates(next: unknown) {
    return prisma.siteConfig.upsert({
        where: { id: 'default' },
        create: { id: 'default', settings: {}, templates: next as any, surveys: [] },
        update: { templates: next as any },
    });
}

export const GET = respond(async () => {
    const config = await getConfig();
    return NextResponse.json((config?.templates as any[]) || []);
}, { auth: 'admin' });

export const PUT = respond(async (req: NextRequest) => {
    const session = await getSession();
    const body = await parseBody(req, PutBodySchema);
    await updateTemplates(body.templates);
    await logAudit({
        action: 'EMAIL_TEMPLATE_UPDATE',
        resource: 'EMAIL_TEMPLATE',
        details: { count: body.templates.length },
        userId: session!.user.id,
        userName: session!.user.name || session!.user.email,
        userRole: session!.user.role,
    });
    return NextResponse.json({ success: true, count: body.templates.length });
}, { auth: 'admin' });

export const DELETE = respond(async (req: NextRequest) => {
    const session = await getSession();
    const body = await parseBody(req, DeleteBodySchema);
    const config = await getConfig();
    if (!config) throw notFound('No templates configured');
    const current = (config.templates as any[]) || [];
    const next = current.filter((t) => t.id !== body.id);
    if (next.length === current.length) {
        throw notFound('Template not found');
    }
    await updateTemplates(next);
    await logAudit({
        action: 'EMAIL_TEMPLATE_UPDATE',
        resource: 'EMAIL_TEMPLATE',
        resourceId: body.id,
        userId: session!.user.id,
        userName: session!.user.name || session!.user.email,
        userRole: session!.user.role,
    });
    return NextResponse.json({ success: true, remaining: next.length });
}, { auth: 'admin' });
