import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasEventAccess, getSession } from '@/lib/auth';
import { respond, badRequest, parseBody } from '@/lib/api-helpers';
import { brandBody } from '@/lib/api-helpers/schemas';

const BRAND_FIELDS = [
    'logoUrl', 'faviconUrl', 'primaryColor', 'accentColor', 'backgroundColor',
    'textColor', 'customCss', 'customDomain', 'ogImageUrl', 'tagline',
    'supportEmail', 'supportPhone',
] as const;

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await params;
    const brand = await prisma.eventBrand.findUnique({ where: { eventId } });
    return NextResponse.json(brand);
}

export const PATCH = respond(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const { id: eventId } = await params;
        const session = await getSession();
        if (!hasEventAccess(session!, eventId)) {
            throw badRequest('Forbidden');
        }
        const data = await parseBody(request, brandBody);
        const update: Record<string, unknown> = {};
        for (const field of BRAND_FIELDS) {
            if (data[field] !== undefined) update[field] = data[field];
        }
        const brand = await prisma.eventBrand.upsert({
            where: { eventId },
            create: { eventId, ...update },
            update,
        });
        return NextResponse.json(brand);
    },
);
