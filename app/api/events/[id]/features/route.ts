import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { respond, parseBody, badRequest, forbidden, notFound } from '@/lib/api-helpers';
import { z } from 'zod';
import { DEFAULT_EVENT_FEATURES, EVENT_FEATURE_KEYS, getEventFeatures } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
    features: z.record(z.string(), z.boolean()),
});

export const GET = respond(async (_req: NextRequest, ctx: { params: any }) => {
    const { id } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { id }, select: { features: true } });
    if (!event) throw notFound('Event not found');
    return NextResponse.json({ features: getEventFeatures(event.features) });
}, { public: true });

export const PUT = respond(async (req: NextRequest, ctx: { params: any }) => {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) throw forbidden('Authentication required');
    if (!hasRole(session.user.role, ORGANIZER_ROLES)) throw forbidden('Organizer role required');
    if (!hasEventAccess(session, id)) throw forbidden('No access to this event');

    const body = await parseBody(req, BodySchema);
    for (const k of Object.keys(body.features)) {
        if (!(EVENT_FEATURE_KEYS as readonly string[]).includes(k)) {
            throw badRequest(`Unknown feature key: ${k}`);
        }
    }
    const next = { ...DEFAULT_EVENT_FEATURES, ...body.features };

    await prisma.event.update({
        where: { id },
        data: { features: next },
    });
    return NextResponse.json({ success: true, features: next });
}, { auth: 'organizer' });
