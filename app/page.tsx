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

export default async function Home() {
  let siteConfig: any = null;
  try {
    siteConfig = await getCachedSiteConfig();
  } catch (error) {
    console.error("Database connection failed:", error);
    siteConfig = null;
  }

  let settings = DEFAULT_SITE_SETTINGS;
  if (siteConfig?.settings) {
    const dbSettings = siteConfig.settings as unknown as Partial<SiteSettings>;
    settings = { ...DEFAULT_SITE_SETTINGS, ...dbSettings };
  }

  return (
    <HomeClient
      initialSettings={settings}
    />
  );
}
