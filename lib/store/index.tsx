'use client';

/**
 * Store contexts.
 *
 * State is split into multiple independent React contexts to avoid global
 * re-renders. Each sub-context can be consumed directly via its dedicated
 * hook (useEventsContext, useTicketsContext, etc.) for better performance.
 *
 * The legacy `useApp()` hook is preserved as a façade that combines the
 * sub-contexts, so existing 19+ consumer files keep working without changes.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from 'react';
import type {
    Event,
    Ticket,
    Review,
    TeamMember,
    SiteSettings,
    Festival,
    EmailTemplate,
    Survey,
    SurveyResponse,
    PromoCode,
    WaitlistEntry,
} from './types';
import {
    DEFAULT_EVENTS,
    DEFAULT_TICKETS,
    DEFAULT_REVIEWS,
    DEFAULT_TEAM_MEMBERS,
    DEFAULT_FESTIVALS,
    DEFAULT_EMAIL_TEMPLATES,
    DEFAULT_SURVEYS,
    DEFAULT_SURVEY_RESPONSES,
    DEFAULT_PROMO_CODES,
    DEFAULT_WAITLIST,
    DEFAULT_SITE_SETTINGS,
} from './defaults';

// ---------------------------------------------------------------------------
// Re-exports for backwards compatibility: components import types and helpers
// from '@/lib/store' the same way they always have.
// ---------------------------------------------------------------------------
export * from './types';
export { DEFAULT_SITE_SETTINGS, CATEGORY_COLORS, DEFAULT_THEME } from './defaults';
export type { TeamRole } from './types';

import type { TeamRole as _TeamRole } from './types';

export const ROLE_PERMISSIONS: Record<_TeamRole, {
    label: string;
    description: string;
    color: string;
    permissions: {
        canManageEvents: boolean;
        canManageTickets: boolean;
        canViewAnalytics: boolean;
        canManageTeam: boolean;
        canManageSettings: boolean;
        canScanTickets: boolean;
        canManageFinancials: boolean;
    };
}> = {
    admin: {
        label: 'Admin',
        description: 'Full access to all features',
        color: 'text-red-400',
        permissions: {
            canManageEvents: true,
            canManageTickets: true,
            canViewAnalytics: true,
            canManageTeam: true,
            canManageSettings: true,
            canScanTickets: true,
            canManageFinancials: true,
        },
    },
    manager: {
        label: 'Manager',
        description: 'Manage events, view analytics, manage tickets',
        color: 'text-purple-400',
        permissions: {
            canManageEvents: true,
            canManageTickets: true,
            canViewAnalytics: true,
            canManageTeam: false,
            canManageSettings: false,
            canScanTickets: true,
            canManageFinancials: false,
        },
    },
    staff: {
        label: 'Staff',
        description: 'View events, manage attendees',
        color: 'text-blue-400',
        permissions: {
            canManageEvents: false,
            canManageTickets: true,
            canViewAnalytics: false,
            canManageTeam: false,
            canManageSettings: false,
            canScanTickets: true,
            canManageFinancials: false,
        },
    },
    scanner: {
        label: 'Scanner',
        description: 'Check-in attendees only',
        color: 'text-green-400',
        permissions: {
            canManageEvents: false,
            canManageTickets: false,
            canViewAnalytics: false,
            canManageTeam: false,
            canManageSettings: false,
            canScanTickets: true,
            canManageFinancials: false,
        },
    },
};

// ---------------------------------------------------------------------------
// Split contexts. New code can import these directly for narrow subscriptions.
// ---------------------------------------------------------------------------

interface EventsContextValue {
    events: Event[];
    setEvents: (e: Event[]) => void;
    addEvent: (e: Event) => Promise<boolean>;
    updateEvent: (id: string, data: Partial<Event>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    duplicateEvent: (id: string) => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);
export const useEventsContext = () => {
    const ctx = useContext(EventsContext);
    if (!ctx) throw new Error('useEventsContext must be used within AppProvider');
    return ctx;
};

interface TicketsContextValue {
    tickets: Ticket[];
    setTickets: (t: Ticket[]) => void;
    addTicket: (t: Ticket) => void;
    updateTicket: (id: string, data: Partial<Ticket>) => void;
    deleteTicket: (id: string) => void;
}

const TicketsContext = createContext<TicketsContextValue | null>(null);
export const useTicketsContext = () => {
    const ctx = useContext(TicketsContext);
    if (!ctx) throw new Error('useTicketsContext must be used within AppProvider');
    return ctx;
};

interface TeamContextValue {
    teamMembers: TeamMember[];
    setTeamMembers: (m: TeamMember[]) => void;
    addTeamMember: (m: TeamMember) => void;
    updateTeamMember: (id: string, data: Partial<TeamMember>) => void;
    removeTeamMember: (id: string) => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);
export const useTeamContext = () => {
    const ctx = useContext(TeamContext);
    if (!ctx) throw new Error('useTeamContext must be used within AppProvider');
    return ctx;
};

interface SiteContextValue {
    siteSettings: SiteSettings;
    updateSiteSettings: (data: Partial<SiteSettings>) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);
export const useSiteContext = () => {
    const ctx = useContext(SiteContext);
    if (!ctx) throw new Error('useSiteContext must be used within AppProvider');
    return ctx;
};

interface FestivalsContextValue {
    festivals: Festival[];
    addFestival: (f: Festival) => void;
    updateFestival: (id: string, data: Partial<Festival>) => void;
    deleteFestival: (id: string) => void;
}

const FestivalsContext = createContext<FestivalsContextValue | null>(null);
export const useFestivalsContext = () => {
    const ctx = useContext(FestivalsContext);
    if (!ctx) throw new Error('useFestivalsContext must be used within AppProvider');
    return ctx;
};

interface EmailsContextValue {
    emailTemplates: EmailTemplate[];
    updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) => void;
}

const EmailsContext = createContext<EmailsContextValue | null>(null);
export const useEmailsContext = () => {
    const ctx = useContext(EmailsContext);
    if (!ctx) throw new Error('useEmailsContext must be used within AppProvider');
    return ctx;
};

interface SurveysContextValue {
    surveys: Survey[];
    surveyResponses: SurveyResponse[];
    addSurvey: (s: Survey) => Promise<void>;
    updateSurvey: (id: string, data: Partial<Survey>) => Promise<void>;
    deleteSurvey: (id: string) => Promise<void>;
    addSurveyResponse: (r: SurveyResponse) => void;
}

const SurveysContext = createContext<SurveysContextValue | null>(null);
export const useSurveysContext = () => {
    const ctx = useContext(SurveysContext);
    if (!ctx) throw new Error('useSurveysContext must be used within AppProvider');
    return ctx;
};

interface PromoContextValue {
    promoCodes: PromoCode[];
    addPromoCode: (c: PromoCode) => Promise<void>;
    updatePromoCode: (id: string, data: Partial<PromoCode>) => Promise<void>;
    deletePromoCode: (id: string) => Promise<void>;
    validatePromoCode: (code: string, eventId: string) => PromoCode | null;
}

const PromoContext = createContext<PromoContextValue | null>(null);
export const usePromoContext = () => {
    const ctx = useContext(PromoContext);
    if (!ctx) throw new Error('usePromoContext must be used within AppProvider');
    return ctx;
};

interface WaitlistContextValue {
    waitlist: WaitlistEntry[];
    addToWaitlist: (entry: WaitlistEntry) => void;
    removeFromWaitlist: (id: string) => void;
    notifyWaitlist: (eventId: string) => void;
}

const WaitlistContext = createContext<WaitlistContextValue | null>(null);
export const useWaitlistContext = () => {
    const ctx = useContext(WaitlistContext);
    if (!ctx) throw new Error('useWaitlistContext must be used within AppProvider');
    return ctx;
};

interface ReviewsContextValue {
    reviews: Review[];
    addReview: (r: Review) => Promise<void>;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);
export const useReviewsContext = () => {
    const ctx = useContext(ReviewsContext);
    if (!ctx) throw new Error('useReviewsContext must be used within AppProvider');
    return ctx;
};

interface AuthContextValue {
    isAdminLoggedIn: boolean;
    isLoading: boolean;
    loginAdmin: (password: string) => boolean;
    logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export const useAuthContext = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthContext must be used within AppProvider');
    return ctx;
};

// ---------------------------------------------------------------------------
// AppProvider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
    // Independent state slices. Updating one slice will not re-render
    // components that only subscribe to a different slice.
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
    const [isLoading, setIsLoading] = useState(true);

    // -----------------------------------------------------------------------
    // Bootstrap: load all data from the server in one go.
    // -----------------------------------------------------------------------
    useEffect(() => {
        const adminSession = typeof localStorage !== 'undefined' ? localStorage.getItem('adminLoggedIn') : null;
        if (adminSession === 'true') setIsAdminLoggedIn(true);

        const loadAll = async () => {
            const tasks: Array<Promise<void>> = [];

            tasks.push(
                fetch('/api/events')
                    .then(r => r.ok ? r.json() : [])
                    .then((data: Event[]) => setEvents(Array.isArray(data) ? data : []))
                    .catch(err => console.error('Failed to load events', err))
            );

            tasks.push(
                fetch('/api/admin/tickets')
                    .then(r => r.ok ? r.json() : [])
                    .then((data: Ticket[]) => setTickets(Array.isArray(data) ? data : []))
                    .catch(err => console.error('Failed to load tickets', err))
            );

            tasks.push(
                fetch('/api/reviews')
                    .then(r => r.ok ? r.json() : [])
                    .then((data: Review[]) => setReviews(Array.isArray(data) ? data : []))
                    .catch(err => console.error('Failed to load reviews', err))
            );

            tasks.push(
                fetch('/api/admin/promo-codes')
                    .then(r => r.ok ? r.json() : [])
                    .then((data: PromoCode[]) => setPromoCodes(Array.isArray(data) ? data : []))
                    .catch(err => console.error('Failed to load promo codes', err))
            );

            tasks.push(
                fetch('/api/settings')
                    .then(r => r.ok ? r.json() : null)
                    .then((data: any) => {
                        if (!data) return;
                        if (data.siteSettings) {
                            setSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...data.siteSettings });
                            if (data.siteSettings.waitlist) setWaitlist(data.siteSettings.waitlist);
                            if (data.siteSettings.festivals) setFestivals(data.siteSettings.festivals);
                            if (data.siteSettings.teamMembers) setTeamMembers(data.siteSettings.teamMembers);
                        } else {
                            setSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...data });
                        }
                        if (data.emailTemplates) setEmailTemplates(data.emailTemplates);
                        if (data.surveys) setSurveys(data.surveys);
                    })
                    .catch(err => console.error('Failed to load settings', err))
            );

            await Promise.all(tasks);
            setIsLoading(false);
        };
        loadAll();
    }, []);

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    const addEvent = useCallback(async (event: Event): Promise<boolean> => {
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event),
            });
            if (res.ok) {
                const newEvent: Event = await res.json();
                setEvents(prev => [newEvent, ...prev]);
                return true;
            }
            const err = await res.json().catch(() => ({}));
            console.error('Failed to add event:', err);
            return false;
        } catch (err) {
            console.error('Failed to add event', err);
            return false;
        }
    }, []);

    const updateEvent = useCallback(async (id: string, data: Partial<Event>) => {
        try {
            const res = await fetch('/api/events', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data }),
            });
            if (res.ok) {
                const updated: Event = await res.json();
                setEvents(prev => prev.map(e => (e.id === id ? updated : e)));
            }
        } catch (err) {
            console.error('Failed to update event', err);
        }
    }, []);

    const deleteEvent = useCallback(async (id: string) => {
        try {
            await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Failed to delete event', err);
        }
    }, []);

    const duplicateEvent = useCallback(async (id: string) => {
        const event = events.find(e => e.id === id);
        if (!event) return;
        const newEvent: Event = {
            ...event,
            id: `event-${Date.now()}`,
            name: `${event.name} (Copy)`,
            soldCount: 0,
            isActive: false,
        };
        await addEvent(newEvent);
    }, [events, addEvent]);

    const eventsValue = useMemo<EventsContextValue>(() => ({
        events, setEvents, addEvent, updateEvent, deleteEvent, duplicateEvent,
    }), [events, addEvent, updateEvent, deleteEvent, duplicateEvent]);

    // -----------------------------------------------------------------------
    // Tickets
    // -----------------------------------------------------------------------
    const addTicket = useCallback((ticket: Ticket) => {
        setTickets(prev => [ticket, ...prev]);
    }, []);

    const updateTicket = useCallback((id: string, data: Partial<Ticket>) => {
        setTickets(prev => prev.map(t => (t.id === id ? { ...t, ...data } : t)));
    }, []);

    const deleteTicket = useCallback((id: string) => {
        setTickets(prev => prev.filter(t => t.id !== id));
    }, []);

    const ticketsValue = useMemo<TicketsContextValue>(() => ({
        tickets, setTickets, addTicket, updateTicket, deleteTicket,
    }), [tickets, addTicket, updateTicket, deleteTicket]);

    // -----------------------------------------------------------------------
    // Team
    // -----------------------------------------------------------------------
    const addTeamMember = useCallback((member: TeamMember) => {
        setTeamMembers(prev => [...prev, member]);
    }, []);

    const updateTeamMember = useCallback((id: string, data: Partial<TeamMember>) => {
        setTeamMembers(prev => prev.map(m => (m.id === id ? { ...m, ...data } : m)));
    }, []);

    const removeTeamMember = useCallback((id: string) => {
        setTeamMembers(prev => prev.filter(m => m.id !== id));
    }, []);

    const teamValue = useMemo<TeamContextValue>(() => ({
        teamMembers, setTeamMembers, addTeamMember, updateTeamMember, removeTeamMember,
    }), [teamMembers, addTeamMember, updateTeamMember, removeTeamMember]);

    // -----------------------------------------------------------------------
    // Site
    // -----------------------------------------------------------------------
    const updateSiteSettings = useCallback((data: Partial<SiteSettings>) => {
        setSiteSettings(prev => ({ ...prev, ...data }));
    }, []);

    const siteValue = useMemo<SiteContextValue>(() => ({ siteSettings, updateSiteSettings }), [siteSettings, updateSiteSettings]);

    // -----------------------------------------------------------------------
    // Festivals
    // -----------------------------------------------------------------------
    const addFestival = useCallback((festival: Festival) => {
        setFestivals(prev => [festival, ...prev]);
    }, []);
    const updateFestival = useCallback((id: string, data: Partial<Festival>) => {
        setFestivals(prev => prev.map(f => (f.id === id ? { ...f, ...data } : f)));
    }, []);
    const deleteFestival = useCallback((id: string) => {
        setFestivals(prev => prev.filter(f => f.id !== id));
    }, []);

    const festivalsValue = useMemo<FestivalsContextValue>(() => ({
        festivals, addFestival, updateFestival, deleteFestival,
    }), [festivals, addFestival, updateFestival, deleteFestival]);

    // -----------------------------------------------------------------------
    // Emails
    // -----------------------------------------------------------------------
    const updateEmailTemplate = useCallback((id: string, data: Partial<EmailTemplate>) => {
        setEmailTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...data } : t)));
    }, []);

    const emailsValue = useMemo<EmailsContextValue>(() => ({ emailTemplates, updateEmailTemplate }), [emailTemplates, updateEmailTemplate]);

    // -----------------------------------------------------------------------
    // Surveys
    // -----------------------------------------------------------------------
    const persistSurveys = useCallback((next: Survey[]) => {
        // Best-effort: write back through /api/settings under surveys key
        fetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ surveys: next }),
        }).catch(err => console.error('Failed to persist surveys', err));
    }, []);

    const addSurvey = useCallback(async (survey: Survey) => {
        const next = [survey, ...surveys];
        setSurveys(next);
        persistSurveys(next);
    }, [surveys, persistSurveys]);

    const updateSurvey = useCallback(async (id: string, data: Partial<Survey>) => {
        const next = surveys.map(s => (s.id === id ? { ...s, ...data } : s));
        setSurveys(next);
        persistSurveys(next);
    }, [surveys, persistSurveys]);

    const deleteSurvey = useCallback(async (id: string) => {
        const next = surveys.filter(s => s.id !== id);
        setSurveys(next);
        persistSurveys(next);
    }, [surveys, persistSurveys]);

    const addSurveyResponse = useCallback((response: SurveyResponse) => {
        setSurveyResponses(prev => [response, ...prev]);
    }, []);

    const surveysValue = useMemo<SurveysContextValue>(() => ({
        surveys, surveyResponses, addSurvey, updateSurvey, deleteSurvey, addSurveyResponse,
    }), [surveys, surveyResponses, addSurvey, updateSurvey, deleteSurvey, addSurveyResponse]);

    // -----------------------------------------------------------------------
    // Promo codes
    // -----------------------------------------------------------------------
    const addPromoCode = useCallback(async (code: PromoCode) => {
        setPromoCodes(prev => [code, ...prev]);
        try {
            const res = await fetch('/api/admin/promo-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(code),
            });
            if (!res.ok) throw new Error('Failed to save promo code');
            const saved: PromoCode = await res.json();
            setPromoCodes(prev => prev.map(c => (c.id === code.id ? saved : c)));
        } catch (err) {
            console.error('Failed to save promo code to API:', err);
            setPromoCodes(prev => prev.filter(c => c.id !== code.id));
        }
    }, []);

    const updatePromoCode = useCallback(async (id: string, data: Partial<PromoCode>) => {
        const previous = promoCodes;
        const next = previous.map(c => (c.id === id ? { ...c, ...data } : c));
        setPromoCodes(next);
        try {
            const res = await fetch('/api/admin/promo-codes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data }),
            });
            if (!res.ok) throw new Error('Failed to update promo code');
            const saved: PromoCode = await res.json();
            setPromoCodes(prev => prev.map(c => (c.id === id ? saved : c)));
        } catch (err) {
            console.error('Failed to update promo code:', err);
            setPromoCodes(previous);
        }
    }, [promoCodes]);

    const deletePromoCode = useCallback(async (id: string) => {
        const previous = promoCodes;
        setPromoCodes(prev => prev.filter(c => c.id !== id));
        try {
            const res = await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete promo code');
        } catch (err) {
            console.error('Failed to delete promo code:', err);
            setPromoCodes(previous);
        }
    }, [promoCodes]);

    const validatePromoCode = useCallback((code: string, eventId: string): PromoCode | null => {
        return promoCodes.find(p =>
            p.code.toLowerCase() === code.toLowerCase() &&
            p.isActive &&
            new Date(p.expiresAt) > new Date() &&
            p.usedCount < p.maxUses &&
            (p.eventIds.length === 0 || p.eventIds.includes(eventId))
        ) ?? null;
    }, [promoCodes]);

    const promoValue = useMemo<PromoContextValue>(() => ({
        promoCodes, addPromoCode, updatePromoCode, deletePromoCode, validatePromoCode,
    }), [promoCodes, addPromoCode, updatePromoCode, deletePromoCode, validatePromoCode]);

    // -----------------------------------------------------------------------
    // Waitlist
    // -----------------------------------------------------------------------
    const persistWaitlist = useCallback((next: WaitlistEntry[]) => {
        fetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ waitlist: next }),
        }).catch(err => console.error('Failed to persist waitlist', err));
    }, []);

    const addToWaitlist = useCallback((entry: WaitlistEntry) => {
        setWaitlist(prev => {
            const next = [entry, ...prev];
            persistWaitlist(next);
            return next;
        });
    }, [persistWaitlist]);

    const removeFromWaitlist = useCallback((id: string) => {
        setWaitlist(prev => {
            const next = prev.filter(w => w.id !== id);
            persistWaitlist(next);
            return next;
        });
    }, [persistWaitlist]);

    const notifyWaitlist = useCallback((eventId: string) => {
        setWaitlist(prev => {
            const next = prev.map(w => (w.eventId === eventId ? { ...w, notified: true } : w));
            persistWaitlist(next);
            return next;
        });
    }, [persistWaitlist]);

    const waitlistValue = useMemo<WaitlistContextValue>(() => ({
        waitlist, addToWaitlist, removeFromWaitlist, notifyWaitlist,
    }), [waitlist, addToWaitlist, removeFromWaitlist, notifyWaitlist]);

    // -----------------------------------------------------------------------
    // Reviews
    // -----------------------------------------------------------------------
    const addReview = useCallback(async (review: Review) => {
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(review),
            });
            if (res.ok) {
                const newReview: Review = await res.json();
                setReviews(prev => [newReview, ...prev]);
            }
        } catch (err) {
            console.error('Failed to add review', err);
        }
    }, []);

    const reviewsValue = useMemo<ReviewsContextValue>(() => ({ reviews, addReview }), [reviews, addReview]);

    // -----------------------------------------------------------------------
    // Auth (mock)
    // -----------------------------------------------------------------------
    const loginAdmin = useCallback((password: string): boolean => {
        if (password === 'admin123') {
            setIsAdminLoggedIn(true);
            if (typeof localStorage !== 'undefined') localStorage.setItem('adminLoggedIn', 'true');
            return true;
        }
        return false;
    }, []);

    const logoutAdmin = useCallback(() => {
        setIsAdminLoggedIn(false);
        if (typeof localStorage !== 'undefined') localStorage.removeItem('adminLoggedIn');
    }, []);

    const authValue = useMemo<AuthContextValue>(() => ({
        isAdminLoggedIn, isLoading, loginAdmin, logoutAdmin,
    }), [isAdminLoggedIn, isLoading, loginAdmin, logoutAdmin]);

    return (
        <AuthContext.Provider value={authValue}>
            <EventsContext.Provider value={eventsValue}>
                <TicketsContext.Provider value={ticketsValue}>
                    <TeamContext.Provider value={teamValue}>
                        <SiteContext.Provider value={siteValue}>
                            <FestivalsContext.Provider value={festivalsValue}>
                                <EmailsContext.Provider value={emailsValue}>
                                    <SurveysContext.Provider value={surveysValue}>
                                        <PromoContext.Provider value={promoValue}>
                                            <WaitlistContext.Provider value={waitlistValue}>
                                                <ReviewsContext.Provider value={reviewsValue}>
                                                    {children}
                                                </ReviewsContext.Provider>
                                            </WaitlistContext.Provider>
                                        </PromoContext.Provider>
                                    </SurveysContext.Provider>
                                </EmailsContext.Provider>
                            </FestivalsContext.Provider>
                        </SiteContext.Provider>
                    </TeamContext.Provider>
                </TicketsContext.Provider>
            </EventsContext.Provider>
        </AuthContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Legacy façade: useApp() returns a combined object so existing components
// keep working without modification. New code should prefer the narrower
// `useXxxContext` hooks above to avoid re-renders on unrelated state changes.
// ---------------------------------------------------------------------------

export interface AppContextType {
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
    isLoading: boolean;
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
    addSurvey: (survey: Survey) => Promise<void>;
    updateSurvey: (id: string, data: Partial<Survey>) => Promise<void>;
    deleteSurvey: (id: string) => Promise<void>;
    addSurveyResponse: (response: SurveyResponse) => void;
    addPromoCode: (code: PromoCode) => Promise<void>;
    updatePromoCode: (id: string, data: Partial<PromoCode>) => Promise<void>;
    deletePromoCode: (id: string) => Promise<void>;
    validatePromoCode: (code: string, eventId: string) => PromoCode | null;
    addToWaitlist: (entry: WaitlistEntry) => void;
    removeFromWaitlist: (id: string) => void;
    notifyWaitlist: (eventId: string) => void;
    loginAdmin: (password: string) => boolean;
    logoutAdmin: () => void;
    showToast?: (message: string, type: 'success' | 'error') => void;
}

export function useApp(): AppContextType {
    const auth = useAuthContext();
    const ev = useEventsContext();
    const tk = useTicketsContext();
    const tm = useTeamContext();
    const st = useSiteContext();
    const fv = useFestivalsContext();
    const em = useEmailsContext();
    const sv = useSurveysContext();
    const pr = usePromoContext();
    const wl = useWaitlistContext();
    const rv = useReviewsContext();

    return {
        events: ev.events,
        tickets: tk.tickets,
        reviews: rv.reviews,
        teamMembers: tm.teamMembers,
        siteSettings: st.siteSettings,
        festivals: fv.festivals,
        emailTemplates: em.emailTemplates,
        surveys: sv.surveys,
        surveyResponses: sv.surveyResponses,
        promoCodes: pr.promoCodes,
        waitlist: wl.waitlist,
        isAdminLoggedIn: auth.isAdminLoggedIn,
        isLoading: auth.isLoading,
        setEvents: ev.setEvents,
        addEvent: ev.addEvent,
        updateEvent: (id, data) => { void ev.updateEvent(id, data); },
        deleteEvent: (id) => { void ev.deleteEvent(id); },
        duplicateEvent: (id) => { void ev.duplicateEvent(id); },
        addTicket: tk.addTicket,
        updateTicket: tk.updateTicket,
        deleteTicket: tk.deleteTicket,
        addReview: (r) => { void rv.addReview(r); },
        addTeamMember: tm.addTeamMember,
        updateTeamMember: tm.updateTeamMember,
        removeTeamMember: tm.removeTeamMember,
        updateSiteSettings: st.updateSiteSettings,
        addFestival: fv.addFestival,
        updateFestival: fv.updateFestival,
        deleteFestival: fv.deleteFestival,
        updateEmailTemplate: em.updateEmailTemplate,
        addSurvey: sv.addSurvey,
        updateSurvey: sv.updateSurvey,
        deleteSurvey: sv.deleteSurvey,
        addSurveyResponse: sv.addSurveyResponse,
        addPromoCode: pr.addPromoCode,
        updatePromoCode: pr.updatePromoCode,
        deletePromoCode: pr.deletePromoCode,
        validatePromoCode: pr.validatePromoCode,
        addToWaitlist: wl.addToWaitlist,
        removeFromWaitlist: wl.removeFromWaitlist,
        notifyWaitlist: wl.notifyWaitlist,
        loginAdmin: auth.loginAdmin,
        logoutAdmin: auth.logoutAdmin,
        showToast: (msg, type) => console.log(`[Toast ${type}]: ${msg}`),
    };
}
