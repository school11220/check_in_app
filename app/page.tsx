import { prisma } from '@/lib/prisma';
import HomeClient from '@/components/HomeClient';
import { DEFAULT_SITE_SETTINGS, SiteSettings } from '@/lib/store';
import { unstable_cache } from 'next/cache';

export const revalidate = 60;

const getCachedSiteConfig = unstable_cache(
  async () => prisma.siteConfig.findUnique({ where: { id: 'default' } }),
  ['site-config'],
  { revalidate: 60 }
);

const getCachedHomeEvents = unstable_cache(
  async () => prisma.event.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: 'desc' }, { date: 'asc' }],
    take: 6,
    select: {
      id: true,
      name: true,
      date: true,
      venue: true,
      price: true,
      imageUrl: true,
      isFeatured: true,
      soldCount: true,
      capacity: true,
    },
  }),
  ['home-events'],
  { revalidate: 60 }
);

export default async function Home() {
  let siteConfig: any = null;
  let initialEvents: {
    id: string;
    name: string;
    date: Date;
    venue: string | null;
    price: number;
    imageUrl: string | null;
    isFeatured: boolean;
    soldCount: number;
    capacity: number;
  }[] = [];

  const hasDatabaseUrl = Boolean(process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);

  if (hasDatabaseUrl) {
    try {
      siteConfig = await getCachedSiteConfig();
      initialEvents = await getCachedHomeEvents();
    } catch (error) {
      console.error("Database connection failed:", error);
      siteConfig = null;
      initialEvents = [];
    }
  }

  let settings = DEFAULT_SITE_SETTINGS;
  if (siteConfig?.settings) {
    const dbSettings = siteConfig.settings as unknown as Partial<SiteSettings>;
    settings = { ...DEFAULT_SITE_SETTINGS, ...dbSettings };
  }

  return (
    <HomeClient
      initialSettings={settings}
      initialEvents={initialEvents.map((event) => ({
        ...event,
        date: event.date.toISOString(),
      }))}
    />
  );
}
