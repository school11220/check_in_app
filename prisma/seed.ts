import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SITE_SETTINGS = {
    siteName: 'EventHub',
    heroTitle: 'Discover Events',
    heroSubtitle: 'Book tickets for concerts, conferences, exhibitions and more. Secure QR code entry.',
    showHero: true,
    accentColor: '#dc2626',
    showEventsGrid: true,
    showFeatures: false,
    showSchedule: false,
    showSponsors: false,
    showFaq: false,
    showCategories: true,
    enabledCategories: ['all', 'music', 'tech', 'art', 'sports', 'food', 'gaming', 'business'],
    eventsGridColumns: 3,
    eventsPerPage: 12,
    navLinks: [],
    showAdminLink: true,
    footerText: `© ${new Date().getFullYear()} EventHub. All rights reserved.`,
    footerLinks: [],
    socialLinks: [],
    showEventSchedule: true,
    showEventReviews: true,
    showEventShare: true,
    showEventCalendar: true,
    showEventCountdown: true,
    globalSalesPaused: false,
    maintenanceMessage: 'Sales are temporarily paused. Please check back soon!',
    smsReminders: false,
    reminderHoursBefore: 24,
};

async function main() {
    console.log('Seeding database...');

    // ---------------------------------------------------------------------
    // SiteConfig singleton (id = "default")
    // ---------------------------------------------------------------------
    const existingConfig = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    if (!existingConfig) {
        await prisma.siteConfig.create({
            data: {
                id: 'default',
                settings: DEFAULT_SITE_SETTINGS,
                templates: [],
                surveys: [],
            },
        });
        console.log('Seeded default SiteConfig.');
    } else {
        // Keep existing settings but make sure new defaults are present.
        const merged = { ...DEFAULT_SITE_SETTINGS, ...(existingConfig.settings as object) };
        await prisma.siteConfig.update({
            where: { id: 'default' },
            data: { settings: merged },
        });
        console.log('SiteConfig already exists; merged new defaults.');
    }

    // ---------------------------------------------------------------------
    // Demo event (only if no events exist)
    // ---------------------------------------------------------------------
    const existingEvents = await prisma.event.count();
    if (existingEvents === 0) {
        await prisma.event.create({
            data: {
                id: crypto.randomUUID(),
                name: 'Tech Conference 2025',
                description: 'The biggest tech conference of the year. Three days of keynotes, workshops, and networking.',
                date: new Date('2025-06-15').toISOString(),
                startTime: '09:00',
                endTime: '18:00',
                venue: 'Convention Center',
                address: '123 Tech Street, Tech City',
                price: 50000,
                category: 'tech',
                capacity: 500,
                soldCount: 0,
                isActive: true,
                isFeatured: true,
                imageUrl:
                    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80',
                organizer: 'TechHub',
                contactEmail: 'info@techhub.com',
                contactPhone: '+1234567890',
                termsAndConditions: 'No refunds within 7 days of the event.',
                registrationDeadline: new Date('2025-06-14').toISOString(),
                earlyBirdEnabled: true,
                earlyBirdPrice: 40000,
                earlyBirdDeadline: new Date('2025-05-01').toISOString(),
                sendReminders: true,
            },
        });
        console.log('Seeded demo event.');
    }

    console.log('Seed completed successfully.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
