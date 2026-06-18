import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://checkin.com';

    let eventEntries: MetadataRoute.Sitemap = [];
    try {
        const events = await prisma.event.findMany({
            where: { isActive: true },
            select: { id: true, updatedAt: true, date: true },
            orderBy: { date: 'desc' },
            take: 5000,
        });
        eventEntries = events.map((event) => ({
            url: `${baseUrl}/event/${event.id}`,
            lastModified: event.updatedAt,
            changeFrequency: 'daily' as const,
            priority: 0.7,
        }));
    } catch (err) {
        // Database might be unreachable during build; fall back to static pages only.
        console.warn('[sitemap] could not load events:', (err as Error).message);
    }

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/discover`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        ...eventEntries,
    ];
}
