import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess } from '@/lib/auth';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await params;
    const brand = await prisma.eventBrand.findUnique({ where: { eventId } });
    return NextResponse.json(brand);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: eventId } = await params;
    if (!hasEventAccess(session, eventId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const data = await request.json();
    const allowed = [
        'logoUrl', 'faviconUrl', 'primaryColor', 'accentColor', 'backgroundColor',
        'textColor', 'customCss', 'customDomain', 'ogImageUrl', 'tagline',
        'supportEmail', 'supportPhone',
    ];
    const update: Record<string, unknown> = {};
    for (const field of allowed) {
        if (data[field] !== undefined) update[field] = data[field];
    }
    const brand = await prisma.eventBrand.upsert({
        where: { eventId },
        create: { eventId, ...update },
        update,
    });
    return NextResponse.json(brand);
}
