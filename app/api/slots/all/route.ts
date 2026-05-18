import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { DEFAULT_TIME_SLOTS, mergeTimeSlots, type TimeSlot } from '@/lib/time-slots';

type SiteSettings = Record<string, unknown> & {
    sessionTimeSlotsByEvent?: Record<string, TimeSlot[]>;
};

function asSettings(value: unknown): SiteSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as SiteSettings;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !hasRole(session.user.role, ORGANIZER_ROLES)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const config = await prisma.siteConfig.findUnique({
            where: { id: 'default' },
            select: { settings: true },
        });

        const settings = asSettings(config?.settings);
        const slotMap = settings.sessionTimeSlotsByEvent || {};
        const slotGroups = Object.entries(slotMap)
            .filter(([eventId]) => hasEventAccess(session, eventId))
            .map(([, slots]) => Array.isArray(slots) ? slots : []);

        return NextResponse.json(mergeTimeSlots([DEFAULT_TIME_SLOTS, ...slotGroups]));
    } catch (error) {
        console.error('Failed to fetch slots:', error);
        return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }
}
