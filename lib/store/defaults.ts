import type {
    Event,
    Ticket,
    Review,
    TeamMember,
    SiteSettings,
    Festival,
    PromoCode,
    Announcement,
} from './types';

export const DEFAULT_EVENTS: Event[] = [];
export const DEFAULT_TICKETS: Ticket[] = [];
export const DEFAULT_REVIEWS: Review[] = [];
export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];
export const DEFAULT_FESTIVALS: Festival[] = [];
export const DEFAULT_PROMO_CODES: PromoCode[] = [];

export const DEFAULT_ANNOUNCEMENT: Announcement = {
    id: 'ann-default',
    message: '',
    bgColor: '#dc2626',
    textColor: '#ffffff',
    isActive: false,
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
    siteName: 'EventHub',
    heroTitle: 'Discover Events',
    heroSubtitle: 'Book tickets for concerts, conferences, exhibitions and more. Secure QR code entry.',
    defaultEventBannerUrl: '',
    accentColor: '#dc2626',
    footerText: '© 2024 EventHub. All rights reserved.',
    socialLinks: [],
    announcement: { ...DEFAULT_ANNOUNCEMENT },
    ticketLogoUrl: '',
    ticketBgColor: '#111111',
    ticketTextColor: '#ffffff',
    ticketAccentColor: '#dc2626',
    ticketBorderColor: '#333333',
    ticketBorderStyle: 'solid',
    ticketShowQrCode: true,
    ticketBorderRadius: 24,
    ticketFontFamily: 'inter',
    ticketGradient: true,
    ticketGradientColor: '#991b1b',
    ticketShowPattern: true,
    ticketPatternType: 'dots',
    ticketHeaderStyle: 'gradient',
    ticketHeaderImage: '',
    ticketQrPosition: 'center',
    ticketQrSize: 'medium',
    ticketShowEventImage: false,
    ticketShowVenue: true,
    ticketShowDate: true,
    ticketShowPrice: true,
    ticketShowStatus: true,
    ticketShowPerforation: true,
    ticketShowEventDescription: false,
    ticketCompactMode: false,
    ticketBadgeText: 'VIP ACCESS',
    ticketFooterText: '',
    ticketWatermark: '',
    customFields: [],
    globalSalesPaused: false,
    maintenanceMessage: 'Sales are temporarily paused. Please check back soon!',
    scheduledMaintenance: null,
    logoUrl: '',
    faviconUrl: '',
    legalPages: {
        privacyPolicy: '',
        termsOfService: '',
        refundPolicy: '',
    },
    customPages: [],
    theme: {
        primaryColor: '#E11D2E',
        secondaryColor: '#B91C1C',
        backgroundColor: '#0B0B0B',
        cardBackground: '#141414',
        textColor: '#FFFFFF',
        mutedTextColor: '#737373',
        borderColor: '#1F1F1F',
        headerFont: 'inter',
        bodyFont: 'inter',
        borderRadius: 'xl',
        darkMode: true,
    },
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    music: { bg: 'bg-purple-900/50', text: 'text-purple-400', border: 'border-purple-800' },
    tech: { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-800' },
    art: { bg: 'bg-pink-900/50', text: 'text-pink-400', border: 'border-pink-800' },
    sports: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-800' },
    food: { bg: 'bg-orange-900/50', text: 'text-orange-400', border: 'border-orange-800' },
    gaming: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-800' },
    business: { bg: 'bg-cyan-900/50', text: 'text-cyan-400', border: 'border-cyan-800' },
    other: { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' },
};

export const DEFAULT_THEME = {
    primaryColor: '#E11D2E',
    secondaryColor: '#B91C1C',
    backgroundColor: '#0B0B0B',
    cardBackground: '#141414',
    textColor: '#FFFFFF',
    mutedTextColor: '#737373',
    borderColor: '#1F1F1F',
    headerFont: 'inter',
    bodyFont: 'inter',
    borderRadius: 'xl',
    darkMode: true,
};
