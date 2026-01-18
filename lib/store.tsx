'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface RegistrationField {
    id: string;
    type: 'text' | 'select' | 'checkbox';
    label: string;
    required: boolean;
    options?: string[]; // For select type
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
    // Early Bird Pricing
    earlyBirdEnabled: boolean;
    earlyBirdPrice: number;
    earlyBirdDeadline: string;
    // Event Reminders
    sendReminders: boolean;
    // Dynamic Pricing
    // Custom Registration Questions
    registrationFields: any[]; // JSON array
}

export interface Ticket {
    id: string;
    name: string;
    email: string;
    phone: string;
    eventId: string;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    checkedIn: boolean;
    checkedInAt?: string;
    updatedAt?: string;
    createdAt: string;
    token?: string;
    purchaseGroupId?: string;
    customAnswers?: Record<string, any>; // JSON object
}

export interface Review {
    id: string;
    eventId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

// Team Permissions
export type TeamRole = 'admin' | 'manager' | 'staff' | 'scanner';

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: TeamRole;
    eventIds: string[]; // Empty array = all events, specific IDs = only those events
    createdAt: string;
    lastActive?: string;
}

export const ROLE_PERMISSIONS: Record<TeamRole, { label: string; description: string; color: string }> = {
    admin: { label: 'Admin', description: 'Full access to all features', color: 'text-red-400' },
    manager: { label: 'Manager', description: 'Manage events, view analytics, manage tickets', color: 'text-purple-400' },
    staff: { label: 'Staff', description: 'View events, manage attendees', color: 'text-blue-400' },
    scanner: { label: 'Scanner', description: 'Check-in attendees only', color: 'text-green-400' },
};

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];

// Site Settings for customization
export interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'select' | 'checkbox' | 'number';
    required: boolean;
    options?: string[]; // For select type
}

// Promo Codes
export interface PromoCode {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number; // percentage (0-100) or fixed amount in paise
    maxUses: number;
    usedCount: number;
    eventIds: string[]; // Empty = all events
    expiresAt: string;
    isActive: boolean;
    createdAt: string;
}

export const DEFAULT_PROMO_CODES: PromoCode[] = [];

// Waitlist
export interface WaitlistEntry {
    id: string;
    eventId: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    notified: boolean;
}

export const DEFAULT_WAITLIST: WaitlistEntry[] = [];

// Announcements
export interface Announcement {
    id: string;
    message: string;
    linkText?: string;
    linkUrl?: string;
    bgColor: string;
    textColor: string;
    isActive: boolean;
    expiresAt?: string;
}

export const DEFAULT_ANNOUNCEMENT: Announcement | null = null;

// Navigation Links
export interface NavLink {
    id: string;
    label: string;
    url: string;
    isExternal: boolean;
    order: number;
}

export interface SiteSettings {
    siteName: string;
    heroTitle: string;
    heroSubtitle: string;
    showHero: boolean;
    accentColor: string;
    // Layout Control
    showEventsGrid: boolean;
    showFeatures?: boolean;
    showSchedule?: boolean;
    showSponsors?: boolean;
    showFaq?: boolean;
    showTicketForm: boolean;
    showCategories: boolean;
    enabledCategories: string[];
    eventsGridColumns: 2 | 3 | 4;
    eventsPerPage: number;
    // Navigation
    navLinks: NavLink[];
    showAdminLink: boolean;
    // Footer
    footerText: string;
    footerLinks: NavLink[];
    socialLinks: { platform: string; url: string }[];
    // Announcement Banner
    announcement: Announcement | null;
    // Event Page Settings
    showEventSchedule: boolean;
    showEventReviews: boolean;
    showEventShare: boolean;
    showEventCalendar: boolean;
    showEventCountdown: boolean;
    // Ticket Design Settings
    ticketLogoUrl: string;
    ticketBgColor: string;
    ticketTextColor: string;
    ticketAccentColor: string;
    ticketBorderColor: string;
    ticketBorderStyle: 'solid' | 'dashed' | 'none';
    ticketShowQrCode: boolean;
    ticketBorderRadius: number;
    ticketFontFamily: 'inter' | 'roboto' | 'playfair' | 'montserrat';
    ticketGradient: boolean;
    ticketGradientColor: string;
    ticketShowPattern: boolean;
    ticketPatternType: 'dots' | 'lines' | 'grid' | 'none';
    // New Layout Settings
    ticketLayout: 'classic' | 'modern' | 'minimal' | 'compact';
    ticketHeaderStyle: 'gradient' | 'solid' | 'image';
    ticketHeaderImage: string;
    ticketQrPosition: 'center' | 'right' | 'bottom';
    ticketQrSize: 'small' | 'medium' | 'large';
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
    // Custom Registration Fields
    customFields: CustomField[];
    // Reminder Settings
    smsReminders: boolean;
    whatsappReminders: boolean;
    reminderHoursBefore: number;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioPhoneNumber?: string;
    whatsappApiKey?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
    siteName: 'EventHub',
    heroTitle: 'Discover Events',
    heroSubtitle: 'Book tickets for concerts, conferences, exhibitions and more. Secure QR code entry.',
    showHero: true,
    accentColor: '#dc2626',
    // Layout Control
    showEventsGrid: true,
    showFeatures: true,
    showSchedule: true,
    showSponsors: true,
    showFaq: true,
    showTicketForm: true,
    showCategories: true,
    enabledCategories: ['all', 'music', 'tech', 'art', 'sports', 'food', 'gaming', 'business'],
    eventsGridColumns: 3,
    eventsPerPage: 12,
    // Navigation
    navLinks: [],
    showAdminLink: true,
    // Footer
    footerText: '© 2024 EventHub. All rights reserved.',
    footerLinks: [],
    socialLinks: [],
    // Announcement
    announcement: null,
    // Event Page Settings
    showEventSchedule: true,
    showEventReviews: true,
    showEventShare: true,
    showEventCalendar: true,
    showEventCountdown: true,
    // Ticket Design defaults
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
    // New Layout defaults
    ticketLayout: 'classic',
    ticketHeaderStyle: 'gradient',
    ticketHeaderImage: '',
    ticketQrPosition: 'center',
    ticketQrSize: 'medium',
    ticketShowEventImage: false,
    ticketShowVenue: true,
    ticketShowDate: true,
    ticketShowTime: true,
    ticketShowPrice: true,
    ticketShowStatus: true,
    ticketShowPerforation: true,
    ticketShowEventDescription: false,
    ticketCompactMode: false,
    ticketBadgeText: 'VIP ACCESS',
    ticketFooterText: '',
    ticketWatermark: '',
    // Custom Fields
    customFields: [],
    // Reminders
    smsReminders: false,
    whatsappReminders: false,
    reminderHoursBefore: 24,
};

// Festivals - group events together
export interface Festival {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    imageUrl?: string;
    eventIds: string[];
    isActive: boolean;
}

export const DEFAULT_FESTIVALS: Festival[] = [];

// Email Templates
export interface EmailTemplate {
    id: string;
    name: string;
    type: 'confirmation' | 'reminder' | 'thankyou' | 'custom';
    subject: string;
    body: string;
    isActive: boolean;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'template-confirmation',
        name: 'Ticket Confirmation',
        type: 'confirmation',
        subject: 'Your ticket for {{eventName}} is confirmed!',
        body: `Hi {{name}},

Thank you for purchasing a ticket for {{eventName}}!

Event Details:
📅 Date: {{eventDate}}
🕐 Time: {{eventTime}}
📍 Venue: {{eventVenue}}

Your Ticket ID: {{ticketId}}

Please bring this email or show your QR code at the venue for entry.

See you there!
The {{siteName}} Team`,
        isActive: true,
    },
    {
        id: 'template-reminder',
        name: 'Event Reminder',
        type: 'reminder',
        subject: 'Reminder: {{eventName}} is coming up!',
        body: `Hi {{name}},

Just a friendly reminder that {{eventName}} is happening soon!

📅 Date: {{eventDate}}
🕐 Time: {{eventTime}}
📍 Venue: {{eventVenue}}

Don't forget to bring your ticket or QR code.

See you there!
The {{siteName}} Team`,
        isActive: true,
    },
    {
        id: 'template-thankyou',
        name: 'Post-Event Thank You',
        type: 'thankyou',
        subject: 'Thank you for attending {{eventName}}!',
        body: `Hi {{name}},

Thank you for attending {{eventName}}! We hope you had a great time.

We'd love to hear your feedback. Please take a moment to share your experience:
{{surveyLink}}

Stay tuned for more exciting events!

Best regards,
The {{siteName}} Team`,
        isActive: true,
    },
];

// Surveys
export interface SurveyQuestion {
    id: string;
    question: string;
    type: 'rating' | 'text' | 'multipleChoice';
    options?: string[];
    required: boolean;
}

export interface Survey {
    id: string;
    eventId: string;
    title: string;
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
    answers: { questionId: string; answer: string | number }[];
    submittedAt: string;
}

export const DEFAULT_SURVEYS: Survey[] = [];
export const DEFAULT_SURVEY_RESPONSES: SurveyResponse[] = [];

// Default data
export const DEFAULT_EVENTS: Event[] = [];

export const DEFAULT_TICKETS: Ticket[] = [];

export const DEFAULT_REVIEWS: Review[] = [];

// Category colors
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

// Context
interface AppContextType {
    events: Event[];
    tickets: Ticket[];
    reviews: Review[];
    teamMembers: TeamMember[];
    siteSettings: SiteSettings;
    festivals: Festival[];
    emailTemplates: EmailTemplate[];
    surveys: Survey[];
    surveyResponses: SurveyResponse[];
    promoCodes: PromoCode[];
    waitlist: WaitlistEntry[];
    isAdminLoggedIn: boolean;
    setEvents: (events: Event[]) => void;
    addEvent: (event: Event) => Promise<boolean>;
    updateEvent: (id: string, data: Partial<Event>) => void;
    deleteEvent: (id: string) => void;
    duplicateEvent: (id: string) => void;
    addTicket: (ticket: Ticket) => void;
    updateTicket: (id: string, data: Partial<Ticket>) => void;
    deleteTicket: (id: string) => void;
    addReview: (review: Review) => void;
    addTeamMember: (member: TeamMember) => void;
    updateTeamMember: (id: string, data: Partial<TeamMember>) => void;
    removeTeamMember: (id: string) => void;
    updateSiteSettings: (data: Partial<SiteSettings>) => void;
    addFestival: (festival: Festival) => void;
    updateFestival: (id: string, data: Partial<Festival>) => void;
    deleteFestival: (id: string) => void;
    updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) => void;
    addSurvey: (survey: Survey) => void;
    updateSurvey: (id: string, data: Partial<Survey>) => void;
    deleteSurvey: (id: string) => void;
    addSurveyResponse: (response: SurveyResponse) => void;
    // Promo Codes
    addPromoCode: (code: PromoCode) => void;
    updatePromoCode: (id: string, data: Partial<PromoCode>) => void;
    deletePromoCode: (id: string) => void;
    validatePromoCode: (code: string, eventId: string) => PromoCode | null;
    // Waitlist
    addToWaitlist: (entry: WaitlistEntry) => void;
    removeFromWaitlist: (id: string) => void;
    notifyWaitlist: (eventId: string) => void;
    loginAdmin: (password: string) => boolean;
    logoutAdmin: () => void;
    showToast?: (message: string, type: 'success' | 'error') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [events, setEvents] = useState<Event[]>(DEFAULT_EVENTS);
    const [tickets, setTickets] = useState<Ticket[]>(DEFAULT_TICKETS);
    const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM_MEMBERS);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
    const [festivals, setFestivals] = useState<Festival[]>(DEFAULT_FESTIVALS);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
    const [surveys, setSurveys] = useState<Survey[]>(DEFAULT_SURVEYS);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>(DEFAULT_SURVEY_RESPONSES);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>(DEFAULT_PROMO_CODES);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(DEFAULT_WAITLIST);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

    useEffect(() => {
        // Load admin session
        const adminSession = localStorage.getItem('adminLoggedIn');
        if (adminSession === 'true') setIsAdminLoggedIn(true);

        // Load site settings from localStorage
        const savedSettings = localStorage.getItem('siteSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...parsed });
            } catch (e) {
                console.error('Failed to parse site settings:', e);
            }
        }

        // Load festivals from localStorage
        const savedFestivals = localStorage.getItem('festivals');
        if (savedFestivals) {
            try {
                setFestivals(JSON.parse(savedFestivals));
            } catch (e) {
                console.error('Failed to parse festivals:', e);
            }
        }

        // Load promo codes from localStorage
        const savedPromoCodes = localStorage.getItem('promoCodes');
        if (savedPromoCodes) {
            try {
                setPromoCodes(JSON.parse(savedPromoCodes));
            } catch (e) {
                console.error('Failed to parse promo codes:', e);
            }
        }

        // Load waitlist from localStorage
        const savedWaitlist = localStorage.getItem('waitlist');
        if (savedWaitlist) {
            try {
                setWaitlist(JSON.parse(savedWaitlist));
            } catch (e) {
                console.error('Failed to parse waitlist:', e);
            }
        }

        // Fetch tickets from API
        const fetchTickets = async () => {
            try {
                const res = await fetch('/api/admin/tickets');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setTickets(data);
                    }
                }
            } catch (error) {
                console.error('Failed to load tickets', error);
            }
        };
        fetchTickets();

        // Fetch events from API
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/events');
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                }
            } catch (error) {
                console.error('Failed to load events', error);
            }
        };
        fetchEvents();

        // Fetch reviews from API
        const fetchReviews = async () => {
            try {
                const res = await fetch('/api/reviews');
                if (res.ok) {
                    const data = await res.json();
                    setReviews(data);
                }
            } catch (error) {
                console.error('Failed to load reviews', error);
            }
        };
        fetchReviews();
    }, []);

    const addEvent = async (event: Event): Promise<boolean> => {
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event),
            });
            if (res.ok) {
                const newEvent = await res.json();
                setEvents(prev => [newEvent, ...prev]);
                return true;
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to add event:', errorData);
                return false;
            }
        } catch (error) {
            console.error('Failed to add event', error);
            return false;
        }
    };

    const updateEvent = async (id: string, data: Partial<Event>) => {
        try {
            const res = await fetch('/api/events', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data }),
            });
            if (res.ok) {
                const updated = await res.json();
                setEvents(prev => prev.map(e => e.id === id ? updated : e));
            }
        } catch (error) {
            console.error('Failed to update event', error);
        }
    };

    const deleteEvent = async (id: string) => {
        try {
            await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Failed to delete event', error);
        }
    };

    const duplicateEvent = async (id: string) => {
        const event = events.find(e => e.id === id);
        if (event) {
            const newEvent = {
                ...event,
                id: `event-${Date.now()}`,
                name: `${event.name} (Copy)`,
                soldCount: 0,
            };
            await addEvent(newEvent);
        }
    };

    const addTicket = (ticket: Ticket) => {
        setTickets([ticket, ...tickets]);
        // Note: Sold count update should ideally happen via API on ticket creation,
        // but for now we keep local state sync or rely on refresh.
    };

    const updateTicket = (id: string, data: Partial<Ticket>) => {
        setTickets(tickets.map(t => t.id === id ? { ...t, ...data } : t));
    };

    const deleteTicket = (id: string) => {
        const ticket = tickets.find(t => t.id === id);
        if (ticket) {
            setTickets(tickets.filter(t => t.id !== id));
            // Update sold count locally if needed, but assuming API handles it
        }
    };

    const addReview = async (review: Review) => {
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(review),
            });
            if (res.ok) {
                const newReview = await res.json();
                setReviews(prev => [newReview, ...prev]);
            }
        } catch (error) {
            console.error('Failed to add review', error);
        }
    };

    const loginAdmin = (password: string): boolean => {
        if (password === 'admin123') {
            setIsAdminLoggedIn(true);
            localStorage.setItem('adminLoggedIn', 'true');
            return true;
        }
        return false;
    };

    const logoutAdmin = () => {
        setIsAdminLoggedIn(false);
        localStorage.removeItem('adminLoggedIn');
    };

    const addTeamMember = (member: TeamMember) => setTeamMembers([member, ...teamMembers]);
    const updateTeamMember = (id: string, data: Partial<TeamMember>) => {
        setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, ...data } : m));
    };
    const removeTeamMember = (id: string) => setTeamMembers(teamMembers.filter(m => m.id !== id));

    const updateSiteSettings = (data: Partial<SiteSettings>) => {
        const newSettings = { ...siteSettings, ...data };
        setSiteSettings(newSettings);
        localStorage.setItem('siteSettings', JSON.stringify(newSettings));
    };

    const addFestival = (festival: Festival) => {
        const newFestivals = [festival, ...festivals];
        setFestivals(newFestivals);
        localStorage.setItem('festivals', JSON.stringify(newFestivals));
    };
    const updateFestival = (id: string, data: Partial<Festival>) => {
        const newFestivals = festivals.map(f => f.id === id ? { ...f, ...data } : f);
        setFestivals(newFestivals);
        localStorage.setItem('festivals', JSON.stringify(newFestivals));
    };
    const deleteFestival = (id: string) => {
        const newFestivals = festivals.filter(f => f.id !== id);
        setFestivals(newFestivals);
        localStorage.setItem('festivals', JSON.stringify(newFestivals));
    };

    const updateEmailTemplate = (id: string, data: Partial<EmailTemplate>) => {
        setEmailTemplates(emailTemplates.map(t => t.id === id ? { ...t, ...data } : t));
    };

    const addSurvey = (survey: Survey) => setSurveys([survey, ...surveys]);
    const updateSurvey = (id: string, data: Partial<Survey>) => {
        setSurveys(surveys.map(s => s.id === id ? { ...s, ...data } : s));
    };
    const deleteSurvey = (id: string) => setSurveys(surveys.filter(s => s.id !== id));
    const addSurveyResponse = (response: SurveyResponse) => setSurveyResponses([response, ...surveyResponses]);

    // Promo Code Functions
    const addPromoCode = (code: PromoCode) => {
        const newCodes = [code, ...promoCodes];
        setPromoCodes(newCodes);
        localStorage.setItem('promoCodes', JSON.stringify(newCodes));
    };
    const updatePromoCode = (id: string, data: Partial<PromoCode>) => {
        const newCodes = promoCodes.map(c => c.id === id ? { ...c, ...data } : c);
        setPromoCodes(newCodes);
        localStorage.setItem('promoCodes', JSON.stringify(newCodes));
    };
    const deletePromoCode = (id: string) => {
        const newCodes = promoCodes.filter(c => c.id !== id);
        setPromoCodes(newCodes);
        localStorage.setItem('promoCodes', JSON.stringify(newCodes));
    };
    const validatePromoCode = (code: string, eventId: string): PromoCode | null => {
        const promo = promoCodes.find(p =>
            p.code.toLowerCase() === code.toLowerCase() &&
            p.isActive &&
            new Date(p.expiresAt) > new Date() &&
            p.usedCount < p.maxUses &&
            (p.eventIds.length === 0 || p.eventIds.includes(eventId))
        );
        return promo || null;
    };

    // Waitlist Functions
    const addToWaitlist = (entry: WaitlistEntry) => {
        const newWaitlist = [entry, ...waitlist];
        setWaitlist(newWaitlist);
        localStorage.setItem('waitlist', JSON.stringify(newWaitlist));
    };
    const removeFromWaitlist = (id: string) => {
        const newWaitlist = waitlist.filter(w => w.id !== id);
        setWaitlist(newWaitlist);
        localStorage.setItem('waitlist', JSON.stringify(newWaitlist));
    };
    const notifyWaitlist = (eventId: string) => {
        const newWaitlist = waitlist.map(w =>
            w.eventId === eventId ? { ...w, notified: true } : w
        );
        setWaitlist(newWaitlist);
        localStorage.setItem('waitlist', JSON.stringify(newWaitlist));
    };

    // Placeholder for toast - typically handled by a separate ToastContext or component
    const showToast = (message: string, type: 'success' | 'error') => {
        console.log(`[Toast ${type}]: ${message}`);
        // This is a placeholder. In a real app, this would trigger a UI toast.
        // For now, we stub it so components destructuring it don't fail.
    };

    return (
        <AppContext.Provider value={{
            events, tickets, reviews, teamMembers, siteSettings, festivals,
            emailTemplates, surveys, surveyResponses, promoCodes, waitlist, isAdminLoggedIn,
            setEvents, addEvent, updateEvent, deleteEvent, duplicateEvent,
            addTicket, updateTicket, deleteTicket, addReview, addTeamMember, updateTeamMember, removeTeamMember,
            updateSiteSettings, addFestival, updateFestival, deleteFestival,
            updateEmailTemplate, addSurvey, updateSurvey, deleteSurvey, addSurveyResponse,
            addPromoCode, updatePromoCode, deletePromoCode, validatePromoCode,
            addToWaitlist, removeFromWaitlist, notifyWaitlist,
            loginAdmin, logoutAdmin,
            showToast, // Add to provider value
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
