import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess } from '@/lib/auth';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!hasEventAccess(session, id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const source = await prisma.event.findUnique({ where: { id } });
    if (!source) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Build a deep copy of source JSON fields and reset soldCount/isActive.
    const data: Prisma.EventUncheckedCreateInput = {
        id: crypto.randomUUID(),
        name: `${source.name} (Copy)`,
        description: source.description,
        date: source.date,
        startTime: source.startTime,
        endTime: source.endTime,
        venue: source.venue,
        address: source.address,
        price: source.price,
        entryFee: source.entryFee,
        prizePool: source.prizePool,
        category: source.category,
        imageUrl: source.imageUrl,
        capacity: source.capacity,
        soldCount: 0,
        isActive: false,
        isFeatured: source.isFeatured,
        schedule: (source.schedule ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        speakers: (source.speakers ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        sponsors: (source.sponsors ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        tags: source.tags,
        organizer: source.organizer,
        organizerId: source.organizerId,
        contactEmail: source.contactEmail,
        contactPhone: source.contactPhone,
        termsAndConditions: source.termsAndConditions,
        registrationDeadline: source.registrationDeadline,
        earlyBirdEnabled: source.earlyBirdEnabled,
        earlyBirdPrice: source.earlyBirdPrice,
        earlyBirdDeadline: source.earlyBirdDeadline,
        sendReminders: source.sendReminders,
        registrationFields: (source.registrationFields ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        organizerVideoLink: source.organizerVideoLink,
        videoLink: source.videoLink,
        gallery: (source.gallery ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        brandPrimaryColor: source.brandPrimaryColor,
        brandAccentColor: source.brandAccentColor,
        brandLogoUrl: source.brandLogoUrl,
        brandBannerUrl: source.brandBannerUrl,
        customDomain: source.customDomain,
    };

    const copy = await prisma.event.create({ data });

    try {
        await prisma.auditLog.create({
            data: {
                id: crypto.randomUUID(),
                action: 'CREATE',
                resource: 'EVENT',
                resourceId: copy.id,
                details: { duplicatedFrom: source.id, eventName: copy.name },
                userId: session.user.id,
                userName: session.user.name || session.user.email,
                userRole: session.user.role,
            },
        });
    } catch (err) {
        console.error('Failed to write audit log', err);
    }

    return NextResponse.json(copy);
}
