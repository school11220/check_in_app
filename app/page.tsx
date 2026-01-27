import { prisma } from '@/lib/prisma';
import HomeClient from '@/components/HomeClient';
import { DEFAULT_SITE_SETTINGS, SiteSettings } from '@/lib/store';
import { calculateDynamicPrice } from '@/lib/pricing';

// Revalidate every 60 seconds to keep data fresh but fast
export const revalidate = 60;

export default async function Home() {
  // Parallel data fetching for maximum speed
  // Parallel data fetching with error handling
  let siteConfig: any = null;
  let events: any[] = [];
  try {
    [siteConfig, events] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 'default' } }),
      prisma.event.findMany({
        where: { isActive: true },
        include: { PricingRule: true },
        orderBy: { date: 'asc' }
      })
    ]);
  } catch (error) {
    console.error("Database connection failed:", error);
    siteConfig = null;
    events = [];
  }

  // Process Settings
  let settings = DEFAULT_SITE_SETTINGS;
  if (siteConfig?.settings) {
    // Merge database settings with defaults
    const dbSettings = siteConfig.settings as unknown as Partial<SiteSettings>;
    settings = { ...DEFAULT_SITE_SETTINGS, ...dbSettings };
  }

  // Process Events (Calculate dynamic pricing server-side)
  const processedEvents = events.map(event => ({
    ...event,
    currentPrice: calculateDynamicPrice(event as any),
    // Ensure dates are serialized as strings for client component
    date: event.date.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString() : '',
    earlyBirdDeadline: event.earlyBirdDeadline ? new Date(event.earlyBirdDeadline).toISOString() : '',
    // Handle other potentially Date objects if any, or JSON fields
    schedule: event.schedule ? JSON.parse(JSON.stringify(event.schedule)) : [],
    speakers: event.speakers ? JSON.parse(JSON.stringify(event.speakers)) : [],
    sponsors: event.sponsors ? JSON.parse(JSON.stringify(event.sponsors)) : [],
    tags: event.tags ? JSON.parse(JSON.stringify(event.tags)) : [],
    gallery: event.gallery ? JSON.parse(JSON.stringify(event.gallery)) : [], // For the gallery field we added
    registrationFields: event.registrationFields ? JSON.parse(JSON.stringify(event.registrationFields)) : [],
  }));

  return (
    <HomeClient
      initialEvents={processedEvents as any}
      initialSettings={settings}
    />
  );
}
