// Types-only file: pure type definitions for the store contexts.
// Importing from here does NOT pull in the providers/reducers.

export interface RegistrationField {
    id: string;
    type: 'text' | 'select' | 'checkbox';
    label: string;
    required: boolean;
    options?: string[];
}

export interface ScheduleItem {
    id: string;
    time: string;
    title: string;
    description: string;
    speaker?: string;
}

export interface Speaker {
    id: string;
    name: string;
    role: string;
    imageUrl?: string;
}

export interface Sponsor {
    id: string;
    name: string;
    logoUrl: string;
    tier: 'gold' | 'silver' | 'bronze';
}

export interface Event {
    id: string;
    name: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    address: string;
    price: number;
    currentPrice?: number;
    entryFee: number;
    prizePool: number;
    category: 'music' | 'tech' | 'art' | 'sports' | 'food' | 'gaming' | 'business' | 'other';
    imageUrl: string;
    capacity: number;
    soldCount: number;
    isActive: boolean;
    isFeatured: boolean;
    schedule: ScheduleItem[];
    speakers: Speaker[];
    sponsors: Sponsor[];
    tags: string[];
    videoLink?: string;
    organizerVideoLink?: string;
    organizer: string;
    contactEmail: string;
    contactPhone: string;
    termsAndConditions: string;
    registrationDeadline: string;
    earlyBirdEnabled: boolean;
    earlyBirdPrice: number;
    earlyBirdDeadline: string;
    sendReminders: boolean;
    registrationFields: any[];
    features?: Record<string, boolean>;
    brandPrimaryColor?: string;
    brandAccentColor?: string;
    brandLogoUrl?: string;
    brandBannerUrl?: string;
    customDomain?: string;
}

export interface Ticket {
    id: string;
    name: string;
    email: string;
    phone: string;
    eventId: string;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'partially_refunded' | 'checked_in';
    lifecycleStatus?: string;
    amountPaid?: number;
    grossAmount?: number;
    discountAmount?: number;
    refundedAmount?: number;
    netAmount?: number;
    paymentMethod?: string;
    lastDeliveredAt?: string;
    deliveryCount?: number;
    checkedIn: boolean;
    checkedInAt?: string;
    updatedAt?: string;
    createdAt: string;
    token?: string;
    purchaseGroupId?: string;
    customAnswers?: Record<string, any>;
}

export interface Review {
    id: string;
    eventId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

export type TeamRole = 'admin' | 'manager' | 'staff' | 'scanner';

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: TeamRole;
    eventIds: string[];
    createdAt: string;
    lastActive?: string;
}

export interface Announcement {
    id: string;
    message: string;
    bgColor: string;
    textColor: string;
    isActive: boolean;
    linkText?: string;
    linkUrl?: string;
}

export interface NavLink {
    id: string;
    label: string;
    href?: string;
    url?: string;
    platform?: string;
    isExternal?: boolean;
}

export interface CustomPage {
    id: string;
    slug: string;
    title: string;
    content: string;
    isActive?: boolean;
    isPublished?: boolean;
    showInFooter?: boolean;
    showInNav: boolean;
    order?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ThemeSettings {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    cardBackground: string;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    headerFont: string;
    bodyFont: string;
    borderRadius: string;
    darkMode: boolean;
}

export interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'select' | 'checkbox' | 'number' | 'date';
    required: boolean;
    options?: string[];
}

export interface SiteSettings {
    siteName: string;
    heroTitle: string;
    heroSubtitle: string;
    showHero: boolean;
    accentColor: string;
    showEventsGrid: boolean;
    showFeatures?: boolean;
    showSchedule?: boolean;
    showSponsors?: boolean;
    showFaq?: boolean;
    showCategories: boolean;
    enabledCategories: string[];
    eventsGridColumns: 2 | 3 | 4 | number;
    eventsPerPage: number;
    navLinks: NavLink[];
    showAdminLink: boolean;
    footerText: string;
    footerLinks: NavLink[];
    socialLinks: NavLink[] | { platform: string; url: string }[];
    announcement: Announcement | null;
    showEventSchedule: boolean;
    showEventReviews: boolean;
    showEventShare: boolean;
    showEventCalendar: boolean;
    showEventCountdown: boolean;
    ticketLogoUrl: string;
    ticketBgColor: string;
    ticketTextColor: string;
    ticketAccentColor: string;
    ticketBorderColor: string;
    ticketBorderStyle: 'solid' | 'dashed' | 'none' | string;
    ticketShowQrCode: boolean;
    ticketBorderRadius: number;
    ticketFontFamily: 'inter' | 'roboto' | 'playfair' | 'montserrat' | string;
    ticketGradient: boolean;
    ticketGradientColor: string;
    ticketShowPattern: boolean;
    ticketPatternType: 'dots' | 'lines' | 'grid' | 'none' | string;
    ticketLayout: 'classic' | 'modern' | 'minimal' | 'compact' | string;
    ticketHeaderStyle: 'gradient' | 'solid' | 'image' | string;
    ticketHeaderImage: string;
    ticketQrPosition: 'center' | 'right' | 'bottom' | string;
    ticketQrSize: 'small' | 'medium' | 'large' | string;
    ticketShowEventImage: boolean;
    ticketShowVenue: boolean;
    ticketShowDate: boolean;
    ticketShowTime: boolean;
    ticketShowPrice: boolean;
    ticketShowStatus: boolean;
    ticketShowPerforation: boolean;
    ticketShowEventDescription: boolean;
    ticketCompactMode: boolean;
    ticketBadgeText: string;
    ticketFooterText: string;
    ticketWatermark: string;
    customFields: CustomField[];
    smsReminders: boolean;
    reminderHoursBefore: number;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioPhoneNumber?: string;
    globalSalesPaused: boolean;
    maintenanceMessage: string;
    scheduledMaintenance: { start: string; end: string } | null;
    logoUrl: string;
    faviconUrl: string;
    adminEmails: string[];
    legalPages: {
        privacyPolicy: string;
        termsOfService: string;
        refundPolicy: string;
        cookiePolicy: string;
    };
    showCookieBanner: boolean;
    customPages: CustomPage[];
    theme: ThemeSettings;
    waitlist?: WaitlistEntry[];
    festivals?: Festival[];
    teamMembers?: TeamMember[];
    // Per-event branding override on the global level (the per-event model is in Prisma)
    brandPrimaryColor?: string;
    brandAccentColor?: string;
    brandLogoUrl?: string;
}

export interface Festival {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    eventIds: string[];
    isActive: boolean;
    createdAt?: string;
    startDate?: string;
    endDate?: string;
}

export interface EmailTemplate {
    id: string;
    name: string;
    type: 'confirmation' | 'reminder' | 'thankyou' | 'custom' | string;
    subject: string;
    body: string;
    isActive: boolean;
}

export interface SurveyQuestion {
    id: string;
    type: 'rating' | 'text' | 'longText' | 'multipleChoice' | 'multiple_choice' | 'yes_no';
    question: string;
    options?: string[];
    required: boolean;
}

export interface Survey {
    id: string;
    eventId: string;
    title?: string;       // legacy: some code uses title, some name
    name?: string;
    description: string;
    questions: SurveyQuestion[];
    isActive: boolean;
    createdAt: string;
}

export interface SurveyResponse {
    id: string;
    surveyId: string;
    eventId: string;
    respondentEmail: string;
    userEmail?: string;
    userName?: string;
    answers: { questionId: string; answer: string | number }[];
    submittedAt: string;
}

export interface PromoCode {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxUses: number;
    usedCount: number;
    eventIds: string[];
    expiresAt: string;
    isActive: boolean;
    createdAt: string;
}

export interface WaitlistEntry {
    id: string;
    eventId: string;
    name: string;
    email: string;
    phone?: string;
    ticketCount: number;
    notified: boolean;
    createdAt: string;
}
