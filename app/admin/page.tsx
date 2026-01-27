'use client';

import { useState, useEffect } from 'react';
import { useApp, CATEGORY_COLORS, Event, ScheduleItem, Speaker, Sponsor, TeamMember, TeamRole, ROLE_PERMISSIONS, SiteSettings, Festival, EmailTemplate, Survey, SurveyQuestion, PromoCode, WaitlistEntry, Announcement, NavLink, CustomPage, ThemeSettings, DEFAULT_THEME } from '@/lib/store';
import { useToast } from '@/components/Toaster';
import { useRouter } from 'next/navigation';
import AttendeeInsights from '@/components/AttendeeInsights';

import ImageUpload from '@/components/admin/ImageUpload';
import PricingRules from '@/components/admin/PricingRules';
import UserManagement from '@/components/admin/UserManagement';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { LogOut, Home, CheckCircle, Search, Trash2, Edit, Copy, Plus, Users, Calendar, BarChart as BarChartIcon, TrendingUp, LayoutDashboard, Shield, MessageSquare, Tent, Mail, ClipboardList, Layout, Tag, BarChart3, History, Ticket, Settings, Award, Clock, Smartphone, Bell, Receipt, Globe, Power, AlertTriangle, Play, Pause, FileText, Palette, Eye, EyeOff, GripVertical } from 'lucide-react';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import IntegrationHub from '@/components/admin/IntegrationHub';
import { ExportButton } from '@/lib/export';
import CertificateManager from '@/components/admin/CertificateManager';
import SessionScheduler from '@/components/admin/SessionScheduler';
import RegistrationFormBuilder from '@/components/admin/RegistrationFormBuilder';
import LayoutManager from '@/components/admin/LayoutManager';
import RichTextEditor from '@/components/admin/RichTextEditor';
import Link from 'next/link';
import EventReviews from '@/components/organizer/EventReviews';
import EventModal from '@/components/EventModal';
import { useClerk, useUser } from '@clerk/nextjs';
import { useDraggable } from '@/hooks/useDraggable';

export default function AdminPage() {
    const router = useRouter();
    const { user } = useUser();
    const { events: allEvents, tickets, teamMembers, siteSettings, festivals, emailTemplates, surveys, promoCodes, waitlist, addEvent, updateEvent, deleteEvent, duplicateEvent, addTicket, updateTicket, deleteTicket, addTeamMember, updateTeamMember, removeTeamMember, updateSiteSettings, addFestival, updateFestival, deleteFestival, updateEmailTemplate, addSurvey, updateSurvey, deleteSurvey, addPromoCode, updatePromoCode, deletePromoCode, addToWaitlist, removeFromWaitlist, notifyWaitlist } = useApp();

    // Filter events based on role
    const role = (user?.publicMetadata?.role as string) || 'UNAUTHORIZED';
    const assignedIds = (user?.publicMetadata?.assignedEventIds as string[]) || [];

    const events = (role === 'ADMIN')
        ? allEvents
        : allEvents.filter(e => assignedIds.includes(e.id));

    const { showToast } = useToast();
    const { ref: scrollRef, events: dragEvents, isDragging } = useDraggable();

    const [activeTab, setActiveTab] = useState<'events' | 'attendees' | 'team' | 'festivals' | 'emails' | 'surveys' | 'settings' | 'layout' | 'growth' | 'analytics' | 'history' | 'certificates' | 'sessions' | 'tickets' | 'audit' | 'integrations' | 'sales' | 'pages' | 'theme' | 'reviews'>('events');
    const [sessionEventId, setSessionEventId] = useState<string>('');
    const [password, setPassword] = useState('');
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<string>('all');
    const [attendeeSearch, setAttendeeSearch] = useState('');
    const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked' | 'unchecked'>('all');
    // Bulk Email State
    const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
    const [selectedBulkEvent, setSelectedBulkEvent] = useState('');
    const [selectedBulkTemplate, setSelectedBulkTemplate] = useState('');
    const [selectedBulkSurvey, setSelectedBulkSurvey] = useState('');

    // Google Sheets Config State
    const [googleSheetId, setGoogleSheetId] = useState('');
    const [serviceAccountEmail, setServiceAccountEmail] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [isSavingSheets, setIsSavingSheets] = useState(false);

    // Fetch Google Sheets Config
    useEffect(() => {
        if (activeTab === 'surveys') {
            fetch('/api/admin/integrations')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const sheets = data.find((i: any) => i.provider === 'google_sheets');
                        if (sheets && sheets.config) {
                            setGoogleSheetId(sheets.config.sheetId || '');
                            setServiceAccountEmail(sheets.config.serviceAccountEmail || '');
                            // If private key is present (masked or not), set it. 
                            setPrivateKey(sheets.config.privateKey || '');
                        }
                    }
                })
                .catch(err => console.error('Failed to load integrations', err));
        }
    }, [activeTab]);

    const saveGoogleSheetsConfig = async () => {
        setIsSavingSheets(true);
        try {
            const res = await fetch('/api/admin/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'google_sheets',
                    name: 'Google Sheets',
                    type: 'analytics',
                    isEnabled: true,
                    config: {
                        sheetId: googleSheetId,
                        serviceAccountEmail: serviceAccountEmail,
                        privateKey: privateKey
                    }
                })
            });
            if (res.ok) {
                showToast('Google Sheets configuration saved!', 'success');
            } else {
                showToast('Failed to save configuration', 'error');
            }
        } catch (error) {
            showToast('Error saving configuration', 'error');
        } finally {
            setIsSavingSheets(false);
        }
    };

    // Calculate daily metrics
    const today = new Date().toDateString();
    const dailyCheckIns = tickets.filter(t => t.checkedIn && t.checkedInAt && new Date(t.checkedInAt).toDateString() === today).length;


    const [ticketDraft, setTicketDraft] = useState<SiteSettings | null>(null);

    // Initialize draft when entering tickets tab
    useEffect(() => {
        if (activeTab === 'tickets' && siteSettings && !ticketDraft) {
            setTicketDraft(siteSettings);
        }
    }, [activeTab, siteSettings]);

    const handleSaveTicketDraft = () => {
        if (ticketDraft) {
            updateSiteSettings(ticketDraft);
            showToast('Ticket design saved successfully', 'success');
        }
    };

    const handleDiscardTicketDraft = () => {
        setTicketDraft(siteSettings);
        showToast('Changes discarded', 'info');
    };

    const { signOut } = useClerk();

    const handleLogout = async () => {
        await signOut({ redirectUrl: '/login' });
    };

    const filteredTickets = tickets.filter(t => {
        const matchesEvent = selectedEvent === 'all' || t.eventId === selectedEvent;
        const matchesSearch = attendeeSearch === '' ||
            t.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
            t.email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
            t.phone.includes(attendeeSearch);
        const matchesCheckIn = checkInFilter === 'all' ||
            (checkInFilter === 'checked' && t.checkedIn) ||
            (checkInFilter === 'unchecked' && !t.checkedIn);
        return matchesEvent && matchesSearch && matchesCheckIn;
    });
    const totalTickets = filteredTickets.length;
    const paidTickets = filteredTickets.filter(t => t.status === 'paid').length;
    const checkedIn = filteredTickets.filter(t => t.checkedIn).length;

    // Calculate revenue from PAID tickets only
    const totalRevenue = filteredTickets
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => {
            const event = events.find(e => e.id === t.eventId);
            return sum + (event?.price || 0);
        }, 0);

    const salesByEvent = events.map(event => ({
        name: (event?.name || 'Unknown').split(' ')[0],
        tickets: tickets.filter(t => t.eventId === event?.id && t.status === 'paid').length,
        revenue: (tickets.filter(t => t.eventId === event?.id && t.status === 'paid').length * (event?.price || 0)) / 100,
    }));

    const checkInData = [{ name: 'Checked In', value: checkedIn }, { name: 'Pending', value: paidTickets - checkedIn }];

    const handleSaveEvent = async (eventData: Partial<Event>) => {
        if (editingEvent) {
            updateEvent(editingEvent.id, eventData);
            showToast('Event updated!', 'success');
        } else {
            const newEvent: Event = {
                id: '', // Server will generate ID
                name: eventData.name || '',
                description: eventData.description || '',
                date: eventData.date || '',
                startTime: eventData.startTime || '09:00',
                endTime: eventData.endTime || '18:00',
                venue: eventData.venue || '',
                address: eventData.address || '',
                price: eventData.price || 0,
                entryFee: eventData.entryFee || eventData.price || 0,
                prizePool: eventData.prizePool || 0,
                category: eventData.category || 'other',
                imageUrl: eventData.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
                capacity: eventData.capacity || 100,
                soldCount: 0,
                isActive: true,
                isFeatured: eventData.isFeatured || false,
                schedule: eventData.schedule || [],
                speakers: eventData.speakers || [],
                sponsors: eventData.sponsors || [],
                tags: eventData.tags || [],
                organizer: eventData.organizer || '',
                contactEmail: eventData.contactEmail || '',
                contactPhone: eventData.contactPhone || '',
                termsAndConditions: eventData.termsAndConditions || '',
                registrationDeadline: eventData.registrationDeadline || '',
                earlyBirdEnabled: eventData.earlyBirdEnabled || false,
                earlyBirdPrice: eventData.earlyBirdPrice || 0,
                earlyBirdDeadline: eventData.earlyBirdDeadline || '',
                sendReminders: eventData.sendReminders ?? true,
                registrationFields: eventData.registrationFields || [],
            };
            const success = await addEvent(newEvent);
            if (success) {
                showToast('Event created!', 'success');
            } else {
                showToast('Failed to create event. Please try again.', 'error');
                return; // Don't close modal on failure
            }
        }
        setShowEventModal(false);
        setEditingEvent(null);
    };

    const handleDeleteEvent = (id: string) => {
        if (confirm('Delete this event? This cannot be undone.')) {
            deleteEvent(id);
            showToast('Event deleted', 'success');
        }
    };

    const handleDuplicateEvent = (id: string) => {
        duplicateEvent(id);
        showToast('Event duplicated!', 'success');
    };

    const exportCSV = () => {
        if (selectedEvent !== 'all') {
            // Server-side export for specific event (includes custom answers)
            window.location.href = `/api/export?eventId=${selectedEvent}`;
            showToast('Export started...', 'success');
            return;
        }

        // Client-side export for "All Events" (basic data only)
        const headers = ['Name', 'Email', 'Phone', 'Event', 'Status', 'Checked In', 'Date'];
        const rows = filteredTickets.map(t => {
            const event = events.find(e => e.id === t.eventId);
            return [t.name, t.email, t.phone, event?.name || '', t.status, t.checkedIn ? 'Yes' : 'No', new Date(t.createdAt).toLocaleString()];
        });
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tickets-all-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast('CSV exported!', 'success');
    };

    // Middleware protects this route
    // if (!isAdminLoggedIn) ... logic removed

    return (
        <main className="min-h-screen bg-[#0B0B0B] py-6 px-4 pb-20">
            <div className="max-w-dashboard mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 glass p-5 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="EventHub" className="w-12 h-12 rounded-xl shadow-lg shadow-red-900/30" />
                        <div>
                            <h1 className="font-heading text-2xl font-bold text-white">EventHub Dashboard</h1>
                            <div className="flex items-center gap-4 text-sm mt-1">
                                <span className="flex items-center gap-1.5 text-[#22C55E]"><span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse"></span>{events.filter(e => e.isActive).length} active events</span>
                                <span className="text-[#737373] font-mono">{dailyCheckIns} check-ins today</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center text-[#B3B3B3] hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">
                            <Home className="w-4 h-4 mr-1.5" /> Home
                        </a>
                        <a href="/checkin" target="_blank" rel="noopener noreferrer" className="flex items-center text-[#B3B3B3] hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">
                            <CheckCircle className="w-4 h-4 mr-1.5" /> Check-In
                        </a>
                        <button onClick={handleLogout} className="flex items-center px-4 py-2.5 bg-[#141414] text-[#B3B3B3] rounded-xl hover:bg-[#1A1A1A] hover:text-white text-sm border border-[#1F1F1F] transition-colors">
                            Logout <LogOut className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div
                    {...dragEvents}
                    ref={scrollRef}
                    className={`flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 cursor-grab active:cursor-grabbing ${isDragging ? '[&>*]:pointer-events-none' : ''}`}
                >
                    {[
                        { id: 'events', label: 'Events', icon: Calendar },
                        { id: 'attendees', label: 'Attendees', icon: Users },
                        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                        { id: 'reviews', label: 'Reviews', icon: MessageSquare },
                        { id: 'sessions', label: 'Sessions', icon: Clock },
                        { id: 'team', label: 'Team', icon: Shield },
                        { id: 'festivals', label: 'Festivals', icon: Tent },
                        { id: 'emails', label: 'Emails', icon: Mail },
                        { id: 'surveys', label: 'Surveys', icon: ClipboardList },
                        { id: 'tickets', label: 'Ticket Design', icon: Ticket },
                        { id: 'layout', label: 'Layout', icon: Layout },
                        { id: 'growth', label: 'Pricing', icon: TrendingUp },
                        { id: 'certificates', label: 'Certificates', icon: Award },
                        { id: 'audit', label: 'Logs', icon: Shield },
                        { id: 'history', label: 'History', icon: History },
                        { id: 'sales', label: 'Sales Control', icon: Power },
                        { id: 'pages', label: 'Pages', icon: FileText },
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-2 text-sm ${activeTab === tab.id
                                    ? 'bg-[#E11D2E] text-white shadow-[0_0_20px_rgba(225,29,46,0.3)]'
                                    : 'bg-[#141414] text-[#737373] hover:bg-[#1A1A1A] hover:text-[#B3B3B3] border border-[#1F1F1F]'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Growth Tab (Merged Pricing & Promo) */}
                {activeTab === 'growth' && (
                    <div className="space-y-8">

                        {/* Promo Codes Section */}
                        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        Promo Codes
                                    </h2>
                                    <p className="text-zinc-400 text-sm">Create discount codes for your events</p>
                                </div>
                                <button
                                    onClick={() => {
                                        addPromoCode({
                                            id: `promo-${Date.now()}`,
                                            code: `SAVE${Math.floor(Math.random() * 1000)}`,
                                            discountType: 'percentage',
                                            discountValue: 10,
                                            maxUses: 100,
                                            usedCount: 0,
                                            eventIds: [],
                                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                            isActive: true,
                                            createdAt: new Date().toISOString(),
                                        });
                                        showToast('Promo code created!', 'success');
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Code
                                </button>
                            </div>

                            {promoCodes.length === 0 ? (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                                    <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <p className="text-zinc-400 mb-2">No promo codes yet</p>
                                    <p className="text-zinc-500 text-sm">Create discount codes to offer savings on tickets</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {promoCodes.map(promo => (
                                        <div key={promo.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">
                                                            {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue / 100}`}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={promo.code}
                                                            onChange={(e) => updatePromoCode(promo.id, { code: e.target.value.toUpperCase() })}
                                                            className="font-mono font-bold text-lg text-white bg-transparent border-none outline-none uppercase tracking-wider"
                                                        />
                                                        <p className="text-sm text-zinc-500">
                                                            Used {promo.usedCount} / {promo.maxUses} times
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updatePromoCode(promo.id, { isActive: !promo.isActive })}
                                                        className={`px-2 py-1 rounded-lg text-xs font-medium ${promo.isActive ? 'bg-green-600/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
                                                    >
                                                        {promo.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                    <button
                                                        onClick={() => { deletePromoCode(promo.id); showToast('Promo code deleted', 'success'); }}
                                                        className="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">Discount Type</label>
                                                    <select
                                                        value={promo.discountType}
                                                        onChange={(e) => updatePromoCode(promo.id, { discountType: e.target.value as 'percentage' | 'fixed' })}
                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                                    >
                                                        <option value="percentage">Percentage</option>
                                                        <option value="fixed">Fixed Amount</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">
                                                        {promo.discountType === 'percentage' ? 'Discount %' : 'Amount (₹)'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={promo.discountType === 'percentage' ? promo.discountValue : promo.discountValue / 100}
                                                        onChange={(e) => updatePromoCode(promo.id, {
                                                            discountValue: promo.discountType === 'percentage'
                                                                ? Number(e.target.value)
                                                                : Number(e.target.value) * 100
                                                        })}
                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">Max Uses</label>
                                                    <input
                                                        type="number"
                                                        value={promo.maxUses}
                                                        onChange={(e) => updatePromoCode(promo.id, { maxUses: Number(e.target.value) })}
                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">Expires</label>
                                                    <input
                                                        type="date"
                                                        value={promo.expiresAt.split('T')[0]}
                                                        onChange={(e) => updatePromoCode(promo.id, { expiresAt: e.target.value })}
                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="block text-xs text-zinc-500 mb-1">Applies to Events</label>
                                                <select
                                                    value={promo.eventIds.length === 0 ? 'all' : 'specific'}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'all') {
                                                            updatePromoCode(promo.id, { eventIds: [] });
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                                >
                                                    <option value="all">All Events</option>
                                                    <option value="specific">Specific Events</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Waitlist Section */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Event Waitlist ({waitlist.length})
                                </h3>
                                {waitlist.length === 0 ? (
                                    <p className="text-zinc-500 text-sm">No waitlist entries yet. When events sell out, customers can join the waitlist.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {waitlist.map(entry => {
                                            const event = events.find(e => e.id === entry.eventId);
                                            return (
                                                <div key={entry.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                                                    <div>
                                                        <p className="text-white font-medium">{entry.name}</p>
                                                        <p className="text-sm text-zinc-500">{entry.email} • {event?.name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {entry.notified ? (
                                                            <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Notified</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    notifyWaitlist(entry.eventId);
                                                                    showToast(`Notified ${entry.name}`, 'success');
                                                                }}
                                                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                            >
                                                                Notify
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => removeFromWaitlist(entry.id)}
                                                            className="p-1 text-zinc-500 hover:text-red-400"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing Rules Section */}
                        <div className="pt-8 border-t border-zinc-800">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Automated Pricing Rules
                            </h2>
                            <PricingRules events={events} />
                        </div>
                    </div>
                )}

                {/* Certificates Tab */}
                {activeTab === 'certificates' && (
                    <CertificateManager
                        eventName={events[0]?.name || 'Event'}
                        eventDate={events[0]?.date}
                        showToast={showToast}
                    />
                )}

                {/* Sessions Tab */}
                {activeTab === 'sessions' && (
                    <div className="space-y-6">
                        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Select Event to Schedule</h3>
                            <select
                                value={sessionEventId || (events[0]?.id || '')}
                                onChange={(e) => setSessionEventId(e.target.value)}
                                className="w-full sm:w-1/3 px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none"
                            >
                                {events.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                        <SessionScheduler
                            eventId={sessionEventId || events[0]?.id}
                            eventDate={events.find(e => e.id === (sessionEventId || events[0]?.id))?.date}
                            showToast={showToast}
                        />
                    </div>
                )}

                {/* Layout Tab */}


                {/* Ticket Design Tab */}
                {activeTab === 'tickets' && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="font-heading text-xl font-semibold text-white flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#E11D2E] to-[#B91C1C] rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                        </svg>
                                    </div>
                                    Ticket Design Studio
                                </h2>
                                <p className="text-[#737373] text-sm mt-1 ml-13">Customize how your tickets look when attendees receive them</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDiscardTicketDraft}
                                    className="px-4 py-2 border border-[#1F1F1F] text-[#737373] hover:text-white rounded-xl text-sm font-medium transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleSaveTicketDraft}
                                    className="px-4 py-2 bg-[#E11D2E] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Save Changes
                                </button>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                            <h3 className="font-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#E11D2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Quick Presets
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Classic Dark */}
                                <button
                                    onClick={() => setTicketDraft(prev => ({
                                        ...(prev || siteSettings),
                                        ticketBgColor: '#111111',
                                        ticketTextColor: '#ffffff',
                                        ticketAccentColor: '#dc2626',
                                        ticketBorderColor: '#333333',
                                        ticketGradient: false,
                                        ticketPatternType: 'none',
                                        ticketShowPattern: false,
                                        ticketBorderRadius: 16,
                                        ticketFontFamily: 'inter'
                                    }))}
                                    className="p-4 rounded-xl border border-[#1F1F1F] hover:border-[#E11D2E]/50 transition-all group"
                                >
                                    <div className="h-20 rounded-lg mb-3 bg-[#111111] border border-[#333333] flex items-center justify-center">
                                        <div className="w-8 h-8 bg-red-600 rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-medium text-white group-hover:text-[#FF6B7A]">Classic Dark</p>
                                    <p className="text-xs text-[#737373]">Minimal & elegant</p>
                                </button>

                                {/* Gradient Red */}
                                <button
                                    onClick={() => setTicketDraft(prev => ({
                                        ...(prev || siteSettings),
                                        ticketBgColor: '#1a0000',
                                        ticketTextColor: '#ffffff',
                                        ticketAccentColor: '#dc2626',
                                        ticketGradientColor: '#7f1d1d',
                                        ticketBorderColor: '#dc2626',
                                        ticketGradient: true,
                                        ticketPatternType: 'none',
                                        ticketShowPattern: false,
                                        ticketBorderRadius: 24,
                                        ticketFontFamily: 'inter'
                                    }))}
                                    className="p-4 rounded-xl border border-[#1F1F1F] hover:border-[#E11D2E]/50 transition-all group"
                                >
                                    <div className="h-20 rounded-lg mb-3 bg-gradient-to-br from-[#1a0000] to-[#7f1d1d] border border-red-800 flex items-center justify-center">
                                        <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-medium text-white group-hover:text-[#FF6B7A]">Gradient Red</p>
                                    <p className="text-xs text-[#737373]">Bold & vibrant</p>
                                </button>

                                {/* Premium Gold */}
                                <button
                                    onClick={() => setTicketDraft(prev => ({
                                        ...(prev || siteSettings),
                                        ticketBgColor: '#0a0a08',
                                        ticketTextColor: '#fef3c7',
                                        ticketAccentColor: '#d97706',
                                        ticketGradientColor: '#1c1917',
                                        ticketBorderColor: '#d97706',
                                        ticketGradient: true,
                                        ticketPatternType: 'dots',
                                        ticketShowPattern: true,
                                        ticketBorderRadius: 20,
                                        ticketFontFamily: 'playfair'
                                    }))}
                                    className="p-4 rounded-xl border border-[#1F1F1F] hover:border-[#E11D2E]/50 transition-all group"
                                >
                                    <div className="h-20 rounded-lg mb-3 bg-gradient-to-br from-[#0a0a08] to-[#1c1917] border border-amber-600 flex items-center justify-center">
                                        <div className="w-8 h-8 bg-amber-500 rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-medium text-white group-hover:text-[#FF6B7A]">Premium Gold</p>
                                    <p className="text-xs text-[#737373]">Luxury feel</p>
                                </button>

                                {/* Neon Cyber */}
                                <button
                                    onClick={() => setTicketDraft(prev => ({
                                        ...(prev || siteSettings),
                                        ticketBgColor: '#0a0a0f',
                                        ticketTextColor: '#e0e7ff',
                                        ticketAccentColor: '#8b5cf6',
                                        ticketGradientColor: '#1e1b4b',
                                        ticketBorderColor: '#8b5cf6',
                                        ticketGradient: true,
                                        ticketPatternType: 'grid',
                                        ticketShowPattern: true,
                                        ticketBorderRadius: 16,
                                        ticketFontFamily: 'montserrat'
                                    }))}
                                    className="p-4 rounded-xl border border-[#1F1F1F] hover:border-[#E11D2E]/50 transition-all group"
                                >
                                    <div className="h-20 rounded-lg mb-3 bg-gradient-to-br from-[#0a0a0f] to-[#1e1b4b] border border-violet-500 flex items-center justify-center">
                                        <div className="w-8 h-8 bg-violet-500 rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-medium text-white group-hover:text-[#FF6B7A]">Neon Cyber</p>
                                    <p className="text-xs text-[#737373]">Futuristic vibe</p>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Settings */}
                            <div className="space-y-6">
                                {/* Branding */}
                                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                                    <h3 className="font-heading text-lg font-semibold text-white mb-5 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#E11D2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Branding
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Logo URL */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Logo URL</label>
                                            <input
                                                type="text"
                                                value={ticketDraft?.ticketLogoUrl || ''}
                                                onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketLogoUrl: e.target.value }))}
                                                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:ring-2 focus:ring-[#E11D2E]/20 focus:outline-none transition-all placeholder:text-[#737373]"
                                                placeholder="https://example.com/logo.png"
                                            />
                                            <p className="text-xs text-[#737373] mt-1.5">Displayed in the ticket header</p>
                                        </div>

                                        {/* Logo Upload */}
                                        <div className="bg-[#0D0D0D] border-2 border-dashed border-[#2A2A2A] rounded-xl p-6 text-center hover:border-[#E11D2E]/30 transition-colors relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            alert('Logo must be less than 2MB');
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const base64 = event.target?.result as string;
                                                            setTicketDraft(prev => ({ ...(prev || siteSettings), ticketLogoUrl: base64 }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <svg className="w-10 h-10 text-[#737373] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-[#B3B3B3] text-sm">Drop logo here or click to upload</p>
                                            <p className="text-[#737373] text-xs mt-1">PNG, JPG up to 2MB</p>
                                        </div>

                                        {ticketDraft?.ticketLogoUrl && (
                                            <div className="flex items-center gap-3 p-3 bg-[#0D0D0D] rounded-xl border border-[#1F1F1F]">
                                                <img src={ticketDraft.ticketLogoUrl} alt="Logo preview" className="h-10 object-contain rounded" />
                                                <span className="text-sm text-[#B3B3B3] flex-1 truncate">Logo uploaded</span>
                                                <button onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketLogoUrl: '' }))} className="text-[#E11D2E] hover:text-red-400 p-1">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Colors */}
                                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                                    <h3 className="font-heading text-lg font-semibold text-white mb-5 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#E11D2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                        </svg>
                                        Colors
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Color Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Background */}
                                            <div>
                                                <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Background</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={ticketDraft?.ticketBgColor || '#111111'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketBgColor: e.target.value }))}
                                                        className="w-12 h-12 rounded-xl border-2 border-[#2A2A2A] cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={ticketDraft?.ticketBgColor || '#111111'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketBgColor: e.target.value }))}
                                                        className="flex-1 px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white text-sm font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* Text */}
                                            <div>
                                                <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Text Color</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={ticketDraft?.ticketTextColor || '#ffffff'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketTextColor: e.target.value }))}
                                                        className="w-12 h-12 rounded-xl border-2 border-[#2A2A2A] cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={ticketDraft?.ticketTextColor || '#ffffff'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketTextColor: e.target.value }))}
                                                        className="flex-1 px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white text-sm font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* Accent */}
                                            <div>
                                                <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Accent Color</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={ticketDraft?.ticketAccentColor || '#dc2626'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketAccentColor: e.target.value }))}
                                                        className="w-12 h-12 rounded-xl border-2 border-[#2A2A2A] cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={ticketDraft?.ticketAccentColor || '#dc2626'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketAccentColor: e.target.value }))}
                                                        className="flex-1 px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white text-sm font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* Border */}
                                            <div>
                                                <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Border Color</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={ticketDraft?.ticketBorderColor || '#333333'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketBorderColor: e.target.value }))}
                                                        className="w-12 h-12 rounded-xl border-2 border-[#2A2A2A] cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={ticketDraft?.ticketBorderColor || '#333333'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketBorderColor: e.target.value }))}
                                                        className="flex-1 px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gradient Toggle */}
                                        <div className="flex items-center justify-between p-4 bg-[#0D0D0D] rounded-xl border border-[#1F1F1F]">
                                            <div>
                                                <p className="font-medium text-white">Enable Gradient</p>
                                                <p className="text-sm text-[#737373]">Add gradient effect to header</p>
                                            </div>
                                            <button
                                                onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketGradient: !ticketDraft?.ticketGradient }))}
                                                className={`w-14 h-7 rounded-full transition-colors relative ${ticketDraft?.ticketGradient ? 'bg-[#E11D2E]' : 'bg-[#2A2A2A]'}`}
                                            >
                                                <span className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all shadow-md ${ticketDraft?.ticketGradient ? 'left-8' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {ticketDraft?.ticketGradient && (
                                            <div>
                                                <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Gradient End Color</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={ticketDraft?.ticketGradientColor || '#991b1b'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketGradientColor: e.target.value }))}
                                                        className="w-12 h-12 rounded-xl border-2 border-[#2A2A2A] cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={ticketDraft?.ticketGradientColor || '#991b1b'}
                                                        onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketGradientColor: e.target.value }))}
                                                        className="flex-1 px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Typography & Layout */}
                                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                                    <h3 className="font-heading text-lg font-semibold text-white mb-5 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#E11D2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                        </svg>
                                        Typography & Layout
                                    </h3>

                                    <div className="space-y-5">
                                        {/* Font Family */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-3">Font Family</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'inter', name: 'Inter', style: 'Inter, sans-serif', desc: 'Modern & Clean' },
                                                    { id: 'roboto', name: 'Roboto', style: 'Roboto, sans-serif', desc: 'Professional' },
                                                    { id: 'playfair', name: 'Playfair', style: 'Georgia, serif', desc: 'Elegant Serif' },
                                                    { id: 'montserrat', name: 'Montserrat', style: 'Montserrat, sans-serif', desc: 'Bold & Modern' }
                                                ].map(font => (
                                                    <button
                                                        key={font.id}
                                                        onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketFontFamily: font.id as any }))}
                                                        className={`p-4 rounded-xl text-left transition-all border ${(ticketDraft?.ticketFontFamily || 'inter') === font.id ? 'bg-[#E11D2E]/10 border-[#E11D2E]/50' : 'bg-[#0D0D0D] border-[#1F1F1F] hover:border-[#2A2A2A]'}`}
                                                        style={{ fontFamily: font.style }}
                                                    >
                                                        <p className={`text-lg font-semibold ${(ticketDraft?.ticketFontFamily || 'inter') === font.id ? 'text-[#FF6B7A]' : 'text-white'}`}>{font.name}</p>
                                                        <p className="text-xs text-[#737373] mt-0.5">{font.desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Border Style */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-3">Border Style</label>
                                            <div className="flex gap-3">
                                                {(['solid', 'dashed', 'none'] as const).map(style => (
                                                    <button
                                                        key={style}
                                                        onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketBorderStyle: style }))}
                                                        className={`flex-1 px-4 py-3 rounded-xl text-sm capitalize font-medium transition-all ${ticketDraft?.ticketBorderStyle === style ? 'bg-[#E11D2E] text-white' : 'bg-[#0D0D0D] text-[#B3B3B3] border border-[#1F1F1F] hover:border-[#2A2A2A]'}`}
                                                    >
                                                        {style}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Border Radius */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-3">
                                                Corner Radius: <span className="font-mono text-[#E11D2E]">{ticketDraft?.ticketBorderRadius || 24}px</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="40"
                                                value={ticketDraft?.ticketBorderRadius || 24}
                                                onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketBorderRadius: parseInt(e.target.value) }))}
                                                className="w-full h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer accent-[#E11D2E]"
                                            />
                                            <div className="flex justify-between text-xs text-[#737373] mt-1">
                                                <span>Square</span>
                                                <span>Rounded</span>
                                                <span>Pill</span>
                                            </div>
                                        </div>

                                        {/* Pattern */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-3">Background Pattern</label>
                                            <div className="grid grid-cols-4 gap-3">
                                                {(['none', 'dots', 'lines', 'grid'] as const).map(pattern => (
                                                    <button
                                                        key={pattern}
                                                        onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketPatternType: pattern, ticketShowPattern: pattern !== 'none' }))}
                                                        className={`p-3 rounded-xl text-sm capitalize font-medium transition-all ${(ticketDraft?.ticketPatternType || 'dots') === pattern ? 'bg-[#E11D2E] text-white' : 'bg-[#0D0D0D] text-[#B3B3B3] border border-[#1F1F1F] hover:border-[#2A2A2A]'}`}
                                                    >
                                                        {pattern}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Show QR Code */}
                                        <div className="flex items-center justify-between p-4 bg-[#0D0D0D] rounded-xl border border-[#1F1F1F]">
                                            <div>
                                                <p className="font-medium text-white">Show QR Code</p>
                                                <p className="text-sm text-[#737373]">Display scannable QR for check-in</p>
                                            </div>
                                            <button
                                                onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowQrCode: !ticketDraft?.ticketShowQrCode }))}
                                                className={`w-14 h-7 rounded-full transition-colors relative ${ticketDraft?.ticketShowQrCode ? 'bg-[#E11D2E]' : 'bg-[#2A2A2A]'}`}
                                            >
                                                <span className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all shadow-md ${ticketDraft?.ticketShowQrCode ? 'left-8' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {/* QR Size and Position */}
                                        {ticketDraft?.ticketShowQrCode && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-[#B3B3B3] mb-2">QR Size</label>
                                                    <div className="flex gap-2">
                                                        {(['small', 'medium', 'large'] as const).map(size => (
                                                            <button
                                                                key={size}
                                                                onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketQrSize: size }))}
                                                                className={`flex-1 px-3 py-2 rounded-lg text-sm capitalize ${(ticketDraft?.ticketQrSize || 'medium') === size ? 'bg-[#E11D2E] text-white' : 'bg-[#0D0D0D] text-[#B3B3B3] border border-[#1F1F1F]'}`}
                                                            >
                                                                {size}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-[#B3B3B3] mb-2">QR Position</label>
                                                    <div className="flex gap-2">
                                                        {(['center', 'right', 'bottom'] as const).map(pos => (
                                                            <button
                                                                key={pos}
                                                                onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketQrPosition: pos }))}
                                                                className={`flex-1 px-3 py-2 rounded-lg text-sm capitalize ${(ticketDraft?.ticketQrPosition || 'center') === pos ? 'bg-[#E11D2E] text-white' : 'bg-[#0D0D0D] text-[#B3B3B3] border border-[#1F1F1F]'}`}
                                                            >
                                                                {pos}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Layout & Visibility */}
                                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                                    <h3 className="font-heading text-lg font-semibold text-white mb-5 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#E11D2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                        </svg>
                                        Layout & Visibility
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Compact Mode */}
                                        <div className="flex items-center justify-between p-4 bg-[#0D0D0D] rounded-xl border border-[#1F1F1F]">
                                            <div>
                                                <p className="font-medium text-white">Compact Mode</p>
                                                <p className="text-sm text-[#737373]">Smaller ticket for mobile-first view</p>
                                            </div>
                                            <button
                                                onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketCompactMode: !ticketDraft?.ticketCompactMode }))}
                                                className={`w-14 h-7 rounded-full transition-colors relative ${ticketDraft?.ticketCompactMode ? 'bg-[#E11D2E]' : 'bg-[#2A2A2A]'}`}
                                            >
                                                <span className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all shadow-md ${ticketDraft?.ticketCompactMode ? 'left-8' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {/* Event Image Banner */}
                                        <div className="flex items-center justify-between p-4 bg-[#0D0D0D] rounded-xl border border-[#1F1F1F]">
                                            <div>
                                                <p className="font-medium text-white">Event Image Banner</p>
                                                <p className="text-sm text-[#737373]">Show event poster in ticket header</p>
                                            </div>
                                            <button
                                                onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowEventImage: !ticketDraft?.ticketShowEventImage }))}
                                                className={`w-14 h-7 rounded-full transition-colors relative ${ticketDraft?.ticketShowEventImage ? 'bg-[#E11D2E]' : 'bg-[#2A2A2A]'}`}
                                            >
                                                <span className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all shadow-md ${ticketDraft?.ticketShowEventImage ? 'left-8' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {ticketDraft?.ticketShowEventImage && (
                                            <div>
                                                <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Default Event Banner URL</label>
                                                <input
                                                    type="text"
                                                    value={ticketDraft?.ticketHeaderImage || ''}
                                                    onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketHeaderImage: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none placeholder:text-[#737373]"
                                                    placeholder="https://example.com/event-banner.jpg"
                                                />
                                                <p className="text-xs text-[#737373] mt-1">Fallback image when event has no image</p>
                                            </div>
                                        )}

                                        {/* Visibility Toggles Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Show Date */}
                                            <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-lg border border-[#1F1F1F]">
                                                <span className="text-sm text-[#B3B3B3]">Show Date</span>
                                                <button
                                                    onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowDate: !(ticketDraft?.ticketShowDate !== false) }))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${ticketDraft?.ticketShowDate !== false ? 'bg-[#22C55E]' : 'bg-[#2A2A2A]'}`}
                                                >
                                                    <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${ticketDraft?.ticketShowDate !== false ? 'left-5' : 'left-0.5'}`} />
                                                </button>
                                            </div>

                                            {/* Show Venue */}
                                            <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-lg border border-[#1F1F1F]">
                                                <span className="text-sm text-[#B3B3B3]">Show Venue</span>
                                                <button
                                                    onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowVenue: !(ticketDraft?.ticketShowVenue !== false) }))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${ticketDraft?.ticketShowVenue !== false ? 'bg-[#22C55E]' : 'bg-[#2A2A2A]'}`}
                                                >
                                                    <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${ticketDraft?.ticketShowVenue !== false ? 'left-5' : 'left-0.5'}`} />
                                                </button>
                                            </div>

                                            {/* Show Price */}
                                            <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-lg border border-[#1F1F1F]">
                                                <span className="text-sm text-[#B3B3B3]">Show Price</span>
                                                <button
                                                    onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowPrice: !(ticketDraft?.ticketShowPrice !== false) }))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${ticketDraft?.ticketShowPrice !== false ? 'bg-[#22C55E]' : 'bg-[#2A2A2A]'}`}
                                                >
                                                    <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${ticketDraft?.ticketShowPrice !== false ? 'left-5' : 'left-0.5'}`} />
                                                </button>
                                            </div>

                                            {/* Show Status */}
                                            <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-lg border border-[#1F1F1F]">
                                                <span className="text-sm text-[#B3B3B3]">Show Status</span>
                                                <button
                                                    onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowStatus: !(ticketDraft?.ticketShowStatus !== false) }))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${ticketDraft?.ticketShowStatus !== false ? 'bg-[#22C55E]' : 'bg-[#2A2A2A]'}`}
                                                >
                                                    <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${ticketDraft?.ticketShowStatus !== false ? 'left-5' : 'left-0.5'}`} />
                                                </button>
                                            </div>

                                            {/* Show Perforation */}
                                            <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-lg border border-[#1F1F1F]">
                                                <span className="text-sm text-[#B3B3B3]">Perforation Effect</span>
                                                <button
                                                    onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowPerforation: !(ticketDraft?.ticketShowPerforation !== false) }))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${ticketDraft?.ticketShowPerforation !== false ? 'bg-[#22C55E]' : 'bg-[#2A2A2A]'}`}
                                                >
                                                    <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${ticketDraft?.ticketShowPerforation !== false ? 'left-5' : 'left-0.5'}`} />
                                                </button>
                                            </div>

                                            {/* Show Event Description */}
                                            <div className="flex items-center justify-between p-3 bg-[#0D0D0D] rounded-lg border border-[#1F1F1F]">
                                                <span className="text-sm text-[#B3B3B3]">Event Description</span>
                                                <button
                                                    onClick={() => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketShowEventDescription: !ticketDraft?.ticketShowEventDescription }))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${ticketDraft?.ticketShowEventDescription ? 'bg-[#22C55E]' : 'bg-[#2A2A2A]'}`}
                                                >
                                                    <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${ticketDraft?.ticketShowEventDescription ? 'left-5' : 'left-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Badge Text */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Badge Text</label>
                                            <input
                                                type="text"
                                                value={ticketDraft?.ticketBadgeText || 'VIP ACCESS'}
                                                onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketBadgeText: e.target.value }))}
                                                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none placeholder:text-[#737373]"
                                                placeholder="VIP ACCESS"
                                            />
                                            <p className="text-xs text-[#737373] mt-1">Text shown in ticket header badge</p>
                                        </div>

                                        {/* Footer Text */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Footer Text (optional)</label>
                                            <input
                                                type="text"
                                                value={ticketDraft?.ticketFooterText || ''}
                                                onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketFooterText: e.target.value }))}
                                                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none placeholder:text-[#737373]"
                                                placeholder="Powered by EventHub"
                                            />
                                            <p className="text-xs text-[#737373] mt-1">Additional text in ticket footer</p>
                                        </div>

                                        {/* Watermark */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#B3B3B3] mb-2">Watermark (optional)</label>
                                            <input
                                                type="text"
                                                value={ticketDraft?.ticketWatermark || ''}
                                                onChange={(e) => setTicketDraft(prev => ({ ...(prev || siteSettings), ticketWatermark: e.target.value }))}
                                                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none placeholder:text-[#737373]"
                                                placeholder="OFFICIAL • VERIFIED"
                                            />
                                            <p className="text-xs text-[#737373] mt-1">Diagonal watermark text overlay on ticket</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Registration Fields (Moved from Settings) */}
                            <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Custom Registration Fields
                                </h3>
                                <p className="text-zinc-500 text-sm mb-4">Add extra fields to collect during ticket registration</p>

                                <div className="space-y-3 mb-4">
                                    {(siteSettings.customFields || []).map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-xl">
                                            <span className="w-6 h-6 bg-zinc-700 rounded text-center text-sm text-zinc-400">{index + 1}</span>
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => {
                                                    const newFields = [...(siteSettings.customFields || [])];
                                                    newFields[index] = { ...field, label: e.target.value };
                                                    updateSiteSettings({ customFields: newFields });
                                                }}
                                                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                                placeholder="Field label"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(e) => {
                                                    const newFields = [...(siteSettings.customFields || [])];
                                                    newFields[index] = { ...field, type: e.target.value as 'text' | 'select' | 'checkbox' | 'number' };
                                                    updateSiteSettings({ customFields: newFields });
                                                }}
                                                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm"
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="select">Dropdown</option>
                                                <option value="checkbox">Checkbox</option>
                                            </select>
                                            <button
                                                onClick={() => {
                                                    const newFields = [...(siteSettings.customFields || [])];
                                                    newFields[index] = { ...field, required: !field.required };
                                                    updateSiteSettings({ customFields: newFields });
                                                }}
                                                className={`px-3 py-2 rounded-lg text-sm ${field.required ? 'bg-red-600/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}
                                            >
                                                {field.required ? 'Required' : 'Optional'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newFields = (siteSettings.customFields || []).filter((_, i) => i !== index);
                                                    updateSiteSettings({ customFields: newFields });
                                                }}
                                                className="p-2 text-zinc-500 hover:text-red-400"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        const newField = { id: `field-${Date.now()}`, label: '', type: 'text' as const, required: false };
                                        updateSiteSettings({ customFields: [...(siteSettings.customFields || []), newField] });
                                    }}
                                    className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 flex items-center gap-2 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Custom Field
                                </button>
                            </div>

                            {/* Right Column - Live Preview Start */}
                            <div className="xl:sticky xl:top-6 h-fit">
                                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="font-heading text-lg font-semibold text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Live Preview
                                        </h3>
                                        <span className="text-xs text-[#22C55E] bg-[#22C55E]/10 px-3 py-1 rounded-full border border-[#22C55E]/20">Auto-updating</span>
                                    </div>

                                    {/* Ticket Preview */}
                                    <div
                                        className={`overflow-hidden relative shadow-2xl ${(ticketDraft?.ticketCompactMode ?? siteSettings.ticketCompactMode) ? 'max-w-xs mx-auto' : ''}`}
                                        style={{
                                            borderRadius: `${ticketDraft?.ticketBorderRadius ?? siteSettings.ticketBorderRadius ?? 24}px`,
                                            background: (ticketDraft?.ticketGradient ?? siteSettings.ticketGradient)
                                                ? `linear-gradient(135deg, ${ticketDraft?.ticketBgColor ?? siteSettings.ticketBgColor ?? '#111111'}, ${ticketDraft?.ticketGradientColor ?? siteSettings.ticketGradientColor ?? '#991b1b'})`
                                                : ticketDraft?.ticketBgColor ?? siteSettings.ticketBgColor ?? '#111111',
                                            border: (ticketDraft?.ticketBorderStyle ?? siteSettings.ticketBorderStyle ?? 'solid') === 'none' ? 'none' : `2px ${ticketDraft?.ticketBorderStyle ?? siteSettings.ticketBorderStyle ?? 'solid'} ${ticketDraft?.ticketBorderColor ?? siteSettings.ticketBorderColor ?? '#333333'}`,
                                            fontFamily: (ticketDraft?.ticketFontFamily ?? siteSettings.ticketFontFamily) === 'playfair' ? 'Georgia, serif' : (ticketDraft?.ticketFontFamily ?? siteSettings.ticketFontFamily) === 'montserrat' ? 'Montserrat, sans-serif' : (ticketDraft?.ticketFontFamily ?? siteSettings.ticketFontFamily) === 'roboto' ? 'Roboto, sans-serif' : 'Inter, sans-serif'
                                        }}
                                    >
                                        {/* Pattern Overlay */}
                                        {(ticketDraft?.ticketShowPattern ?? siteSettings.ticketShowPattern) && (ticketDraft?.ticketPatternType ?? siteSettings.ticketPatternType) !== 'none' && (
                                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                                                backgroundImage: (ticketDraft?.ticketPatternType ?? siteSettings.ticketPatternType) === 'dots'
                                                    ? `radial-gradient(circle, ${ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff'} 1px, transparent 1px)`
                                                    : (ticketDraft?.ticketPatternType ?? siteSettings.ticketPatternType) === 'lines'
                                                        ? `repeating-linear-gradient(45deg, transparent, transparent 10px, ${ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff'} 10px, ${ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff'} 11px)`
                                                        : `linear-gradient(to right, ${ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff'} 1px, transparent 1px), linear-gradient(to bottom, ${ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff'} 1px, transparent 1px)`,
                                                backgroundSize: (ticketDraft?.ticketPatternType ?? siteSettings.ticketPatternType) === 'dots' ? '15px 15px' : (ticketDraft?.ticketPatternType ?? siteSettings.ticketPatternType) === 'grid' ? '20px 20px' : 'auto'
                                            }} />
                                        )}

                                        {/* Watermark */}
                                        {(ticketDraft?.ticketWatermark ?? siteSettings.ticketWatermark) && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-20">
                                                <p
                                                    className="text-4xl font-bold opacity-5 whitespace-nowrap"
                                                    style={{
                                                        transform: 'rotate(-30deg)',
                                                        color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff',
                                                        letterSpacing: '0.1em'
                                                    }}
                                                >
                                                    {ticketDraft?.ticketWatermark ?? siteSettings.ticketWatermark}
                                                </p>
                                            </div>
                                        )}

                                        {/* Event Image Banner */}
                                        {(ticketDraft?.ticketShowEventImage ?? siteSettings.ticketShowEventImage) && (
                                            <div className="relative h-24 overflow-hidden">
                                                <img
                                                    src={ticketDraft?.ticketHeaderImage || siteSettings.ticketHeaderImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'}
                                                    alt="Event"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
                                            </div>
                                        )}

                                        {/* Header */}
                                        <div
                                            className={`px-6 ${(ticketDraft?.ticketCompactMode ?? siteSettings.ticketCompactMode) ? 'py-4' : 'py-5'} relative overflow-hidden`}
                                            style={{
                                                background: (ticketDraft?.ticketGradient ?? siteSettings.ticketGradient)
                                                    ? `linear-gradient(135deg, ${ticketDraft?.ticketAccentColor ?? siteSettings.ticketAccentColor ?? '#dc2626'}, ${ticketDraft?.ticketGradientColor ?? siteSettings.ticketGradientColor ?? '#991b1b'})`
                                                    : (ticketDraft?.ticketAccentColor ?? siteSettings.ticketAccentColor ?? '#dc2626')
                                            }}
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                                            {(ticketDraft?.ticketLogoUrl ?? siteSettings.ticketLogoUrl) && (
                                                <img src={ticketDraft?.ticketLogoUrl ?? siteSettings.ticketLogoUrl} alt="Logo" className="h-6 mb-2 opacity-80" />
                                            )}
                                            <div className="flex items-center gap-2 text-xs mb-1 opacity-90 text-white">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                                </svg>
                                                {ticketDraft?.ticketBadgeText ?? siteSettings.ticketBadgeText ?? 'VIP ACCESS'}
                                            </div>
                                            <h3 className={`font-bold text-white ${(ticketDraft?.ticketCompactMode ?? siteSettings.ticketCompactMode) ? 'text-lg' : 'text-xl'}`}>Summer Music Festival</h3>
                                            {(ticketDraft?.ticketShowEventDescription ?? siteSettings.ticketShowEventDescription) && (
                                                <p className="text-xs opacity-70 mt-1 text-white">Amazing event with live performances</p>
                                            )}
                                        </div>

                                        {/* Perforation */}
                                        {(ticketDraft?.ticketShowPerforation ?? siteSettings.ticketShowPerforation) !== false && (
                                            <div className="relative flex items-center bg-transparent">
                                                <div className="absolute left-0 w-3 h-6 rounded-r-full" style={{ backgroundColor: '#0B0B0B' }}></div>
                                                <div className="flex-1 border-t-2 border-dashed mx-3" style={{ borderColor: ticketDraft?.ticketBorderColor ?? siteSettings.ticketBorderColor ?? '#444444' }}></div>
                                                <div className="absolute right-0 w-3 h-6 rounded-l-full" style={{ backgroundColor: '#0B0B0B' }}></div>
                                            </div>
                                        )}

                                        {/* Body */}
                                        <div className={`${(ticketDraft?.ticketCompactMode ?? siteSettings.ticketCompactMode) ? 'p-4' : 'p-5'} relative`}>
                                            {/* Date & Venue */}
                                            {((ticketDraft?.ticketShowDate ?? siteSettings.ticketShowDate) !== false || (ticketDraft?.ticketShowVenue ?? siteSettings.ticketShowVenue) !== false) && (
                                                <div className={`grid ${(ticketDraft?.ticketShowDate ?? siteSettings.ticketShowDate) !== false && (ticketDraft?.ticketShowVenue ?? siteSettings.ticketShowVenue) !== false ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
                                                    {(ticketDraft?.ticketShowDate ?? siteSettings.ticketShowDate) !== false && (
                                                        <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                            <p className="text-[10px] opacity-60 mb-0.5" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>DATE</p>
                                                            <p className="text-sm font-semibold" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>Dec 25, 2024</p>
                                                        </div>
                                                    )}
                                                    {(ticketDraft?.ticketShowVenue ?? siteSettings.ticketShowVenue) !== false && (
                                                        <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                            <p className="text-[10px] opacity-60 mb-0.5" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>VENUE</p>
                                                            <p className="text-sm font-semibold truncate" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>Convention Center</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                <p className="text-[10px] opacity-60 mb-0.5" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>ATTENDEE</p>
                                                <p className="text-base font-semibold" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>John Doe</p>
                                                <p className="text-xs opacity-60" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>john@example.com</p>
                                            </div>

                                            {/* QR Code */}
                                            {(ticketDraft?.ticketShowQrCode ?? siteSettings.ticketShowQrCode) && (
                                                <div className={`flex flex-col ${(ticketDraft?.ticketQrPosition ?? siteSettings.ticketQrPosition) === 'right' ? 'items-end' : 'items-center'}`}>
                                                    <div className="rounded-xl p-3 mb-2" style={{ backgroundColor: '#ffffff' }}>
                                                        <svg
                                                            className={`text-black ${(ticketDraft?.ticketQrSize ?? siteSettings.ticketQrSize) === 'small' ? 'w-16 h-16' : (ticketDraft?.ticketQrSize ?? siteSettings.ticketQrSize) === 'large' ? 'w-28 h-28' : 'w-20 h-20'}`}
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm8-1h7v7h-7V3zm1 1v5h5V4h-5zM3 12h7v7H3v-7zm1 1v5h5v-5H4zm11 1h1v1h-1v-1zm-3-1h1v1h-1v-1zm5 0h1v1h-1v-1zm-2 2h1v1h-1v-1zm2 0h3v3h-3v-3zm1 1v1h1v-1h-1zm-8 3h1v1h-1v-1zm2 0h1v1h-1v-1zm4 0h1v1h-1v-1z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-[10px] opacity-50" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>TICKET-ABC123XYZ</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        {((ticketDraft?.ticketShowPrice ?? siteSettings.ticketShowPrice) !== false || (ticketDraft?.ticketShowStatus ?? siteSettings.ticketShowStatus) !== false || (ticketDraft?.ticketFooterText ?? siteSettings.ticketFooterText)) && (
                                            <div className="px-5 py-3 border-t flex justify-between items-center" style={{ borderColor: ticketDraft?.ticketBorderColor ?? siteSettings.ticketBorderColor ?? '#333333', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                <div>
                                                    {(ticketDraft?.ticketShowPrice ?? siteSettings.ticketShowPrice) !== false && (
                                                        <>
                                                            <p className="text-lg font-bold font-mono" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>₹1,999</p>
                                                            <p className="text-[10px] opacity-50" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>Paid</p>
                                                        </>
                                                    )}
                                                    {(ticketDraft?.ticketFooterText ?? siteSettings.ticketFooterText) && (
                                                        <p className="text-[10px] opacity-60 mt-1" style={{ color: ticketDraft?.ticketTextColor ?? siteSettings.ticketTextColor ?? '#ffffff' }}>{ticketDraft?.ticketFooterText ?? siteSettings.ticketFooterText}</p>
                                                    )}
                                                </div>
                                                {(ticketDraft?.ticketShowStatus ?? siteSettings.ticketShowStatus) !== false && (
                                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>VALID</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-center text-[#737373] text-xs mt-4">This is how your tickets will appear</p>
                                </div>
                            </div>
                        </div>
                    </div >
                )
                }

                {/* Events */}
                {
                    activeTab === 'events' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h2 className="text-xl font-semibold text-white">Events ({events.length})</h2>
                                <div className="flex gap-2">
                                    <ExportButton
                                        data={events.filter(e => e && e.id).map(event => ({
                                            'Event ID': event.id,
                                            'Name': event.name || '',
                                            'Category': event.category || 'other',
                                            'Date': event.date ? new Date(event.date).toLocaleDateString() : 'TBD',
                                            'Venue': event.venue || '',
                                            'Price (₹)': ((event.price || 0) / 100).toFixed(2),
                                            'Capacity': event.capacity || 'Unlimited',
                                            'Sold': tickets.filter(t => t.eventId === event.id && t.status === 'paid').length,
                                            'Featured': event.isFeatured ? 'Yes' : 'No',
                                        }))}
                                        filename={`events-${new Date().toISOString().split('T')[0]}`}
                                        onExport={() => showToast('Events exported!', 'success')}
                                    />
                                    <button onClick={() => { setEditingEvent(null); setShowEventModal(true); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Create Event
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {events.filter(e => e && e.id).length === 0 && events.length > 0 && (
                                    <div className="col-span-full text-center py-8 text-zinc-500">
                                        Unable to display events. Data may be corrupted.
                                    </div>
                                )}
                                {events.filter(e => e && e.id).map(event => {
                                    const categoryStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
                                    const capacity = event.capacity || 1; // Prevent division by zero
                                    // Calculate sold count from verified paid tickets only
                                    const soldCount = tickets.filter(t => t.eventId === event.id && t.status === 'paid').length;
                                    const capacityPercent = Math.min(Math.round((soldCount / capacity) * 100), 100);
                                    const eventDate = event.date ? new Date(event.date) : null;
                                    const dateStr = eventDate && !isNaN(eventDate.getTime())
                                        ? eventDate.toLocaleDateString()
                                        : 'Date TBD';
                                    return (
                                        <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                            <div className="h-32 relative">
                                                <img src={event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'} alt={event.name || 'Event'} className="w-full h-full object-cover" />
                                                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>{event.category || 'other'}</span>
                                                {event.isFeatured && <span className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-600 text-white rounded-full text-xs font-bold">FEATURED</span>}
                                                {(event.prizePool || 0) > 0 && <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-bold">₹{((event.prizePool || 0) / 100).toLocaleString()} Prize</span>}
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-semibold text-white mb-1 truncate">{event.name || 'Untitled Event'}</h3>
                                                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                                                    <span>{dateStr} • {event.startTime || '09:00'}</span>
                                                    <span>₹{((event.price || 0) / 100).toLocaleString()}</span>
                                                </div>
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-zinc-500">Sold</span>
                                                        <span className={capacityPercent >= 90 ? 'text-red-400' : 'text-zinc-300'}>{soldCount}/{capacity}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${capacityPercent >= 90 ? 'bg-red-500' : capacityPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${capacityPercent}%` }} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { setEditingEvent(event); setShowEventModal(true); }} className="flex-1 px-2 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 text-xs">Edit</button>
                                                    <button onClick={() => handleDuplicateEvent(event.id)} className="px-2 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 text-xs" title="Duplicate">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteEvent(event.id)} className="px-2 py-1.5 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 text-xs">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }

                {/* Attendees */}
                {
                    activeTab === 'attendees' && (
                        <div className="space-y-6">
                            {/* Header with stats */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Attendee Check-in List
                                    </h2>
                                    <p className="text-zinc-400 text-sm">View and manage event attendees</p>
                                </div>
                                <div className="flex gap-2">
                                    <ExportButton
                                        data={filteredTickets.map(t => {
                                            const event = events.find(e => e.id === t.eventId);
                                            return {
                                                'Ticket ID': t.id,
                                                'Name': t.name,
                                                'Email': t.email,
                                                'Phone': t.phone || '',
                                                'Event': event?.name || '',
                                                'Status': t.status,
                                                'Checked In': t.checkedIn ? 'Yes' : 'No',
                                                'Amount Paid': `₹${((event?.price || 0) / 100).toFixed(2)}`,
                                                'Purchase Date': new Date(t.createdAt).toLocaleDateString()
                                            };
                                        })}
                                        filename={`attendees-${new Date().toISOString().split('T')[0]}`}
                                        onExport={() => showToast('Attendee list exported!', 'success')}
                                    />
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs font-medium">Total Attendees</p>
                                    <p className="text-2xl font-bold text-white mt-1">{tickets.length}</p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs font-medium">Checked In</p>
                                    <p className="text-2xl font-bold text-green-400 mt-1">{tickets.filter(t => t.checkedIn).length}</p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs font-medium">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-400 mt-1">{tickets.filter(t => !t.checkedIn).length}</p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                    <p className="text-zinc-500 text-xs font-medium">Check-in Rate</p>
                                    <p className="text-2xl font-bold text-blue-400 mt-1">{tickets.length > 0 ? Math.round((tickets.filter(t => t.checkedIn).length / tickets.length) * 100) : 0}%</p>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or phone..."
                                        value={attendeeSearch}
                                        onChange={(e) => setAttendeeSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                                <select
                                    value={selectedEvent}
                                    onChange={(e) => setSelectedEvent(e.target.value)}
                                    className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white"
                                >
                                    <option value="all">All Events</option>
                                    {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                                <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setCheckInFilter('all')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${checkInFilter === 'all' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setCheckInFilter('checked')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${checkInFilter === 'checked' ? 'bg-green-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Checked In
                                    </button>
                                    <button
                                        onClick={() => setCheckInFilter('unchecked')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${checkInFilter === 'unchecked' ? 'bg-yellow-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Pending
                                    </button>
                                </div>
                            </div>

                            {/* Results count */}
                            <p className="text-sm text-zinc-500">
                                Showing {filteredTickets.length} of {tickets.length} attendees
                                {attendeeSearch && ` matching "${attendeeSearch}"`}
                            </p>

                            {/* Attendee Table */}
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    {filteredTickets.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <p className="text-zinc-400">No attendees found</p>
                                            <p className="text-zinc-500 text-sm mt-1">Try adjusting your search or filters</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-zinc-800">
                                                <tr>
                                                    <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Attendee</th>
                                                    <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Ticket ID</th>
                                                    <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Event</th>
                                                    <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Details</th>
                                                    <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Status</th>
                                                    <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Check-In</th>
                                                    <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800">
                                                {filteredTickets.map(ticket => {
                                                    const event = events.find(e => e.id === ticket.eventId);
                                                    return (
                                                        <tr key={ticket.id} className="hover:bg-zinc-800/50">
                                                            <td className="px-6 py-4">
                                                                <p className="text-white font-medium">{ticket.name}</p>
                                                                <p className="text-zinc-500 text-sm">{ticket.email}</p>
                                                                <p className="text-zinc-600 text-xs">{ticket.phone}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">{ticket.id}</code>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="text-zinc-300">{event?.name}</p>
                                                                <p className="text-xs text-zinc-500">₹{((event?.price || 0) / 100).toLocaleString()}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {ticket.customAnswers && Object.keys(ticket.customAnswers).length > 0 ? (
                                                                    <div className="space-y-1">
                                                                        {Object.entries(ticket.customAnswers).map(([key, value]) => {
                                                                            const field = event?.registrationFields?.find((f: any) => f.id === key);
                                                                            return (
                                                                                <div key={key} className="text-xs">
                                                                                    <span className="text-zinc-500">{field?.label || key}: </span>
                                                                                    <span className="text-zinc-300">{String(value)}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-zinc-600 text-xs">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ticket.status === 'paid' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                                                                    {ticket.status.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {ticket.checkedIn ? (
                                                                    <span className="flex items-center gap-1 text-green-400 text-sm">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        Checked In
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-zinc-500 text-sm">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <button
                                                                    onClick={() => router.push(`/ticket/${ticket.id}`)}
                                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                                >
                                                                    View Ticket
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Team */}
                {
                    activeTab === 'team' && (
                        <UserManagement events={events} />
                    )
                }



                {/* Festivals */}
                {
                    activeTab === 'festivals' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Festivals</h2>
                                    <p className="text-zinc-400 text-sm">Group events under festivals or themed collections</p>
                                </div>
                                <button
                                    onClick={() => {
                                        addFestival({
                                            id: `festival-${Date.now()}`,
                                            name: 'New Festival',
                                            description: 'Festival description',
                                            startDate: new Date().toISOString().split('T')[0],
                                            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                            eventIds: [],
                                            isActive: true,
                                        });
                                        showToast('Festival created!', 'success');
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Festival
                                </button>
                            </div>

                            {festivals.length === 0 ? (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                                    <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="text-zinc-400 mb-2">No festivals yet</p>
                                    <p className="text-zinc-500 text-sm">Create a festival to group related events together</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {festivals.map(festival => (
                                        <div key={festival.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                            <div className="p-5 border-b border-zinc-800">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <input
                                                            type="text"
                                                            value={festival.name}
                                                            onChange={(e) => updateFestival(festival.id, { name: e.target.value })}
                                                            className="font-semibold text-white text-lg bg-transparent border-none outline-none w-full focus:bg-zinc-800 focus:px-2 rounded"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={festival.description}
                                                            onChange={(e) => updateFestival(festival.id, { description: e.target.value })}
                                                            className="text-sm text-zinc-500 mt-1 bg-transparent border-none outline-none w-full focus:bg-zinc-800 focus:px-2 rounded"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateFestival(festival.id, { isActive: !festival.isActive })}
                                                            className={`px-2 py-1 rounded-lg text-xs font-medium ${festival.isActive ? 'bg-green-600/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
                                                        >
                                                            {festival.isActive ? 'Active' : 'Inactive'}
                                                        </button>
                                                        <button
                                                            onClick={() => { deleteFestival(festival.id); showToast('Festival deleted', 'success'); }}
                                                            className="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-zinc-500">Start:</span>
                                                        <input
                                                            type="date"
                                                            value={festival.startDate}
                                                            onChange={(e) => updateFestival(festival.id, { startDate: e.target.value })}
                                                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-zinc-500">End:</span>
                                                        <input
                                                            type="date"
                                                            value={festival.endDate}
                                                            onChange={(e) => updateFestival(festival.id, { endDate: e.target.value })}
                                                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Events in Festival */}
                                            <div className="p-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-medium text-zinc-400">Events ({festival.eventIds.length})</p>
                                                </div>

                                                {/* Current Events */}
                                                {festival.eventIds.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {festival.eventIds.map(eventId => {
                                                            const event = events.find(e => e.id === eventId);
                                                            if (!event) return null;
                                                            return (
                                                                <div key={eventId} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-1.5 group">
                                                                    <span className="text-sm text-zinc-300">{event.name}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            updateFestival(festival.id, { eventIds: festival.eventIds.filter(id => id !== eventId) });
                                                                        }}
                                                                        className="text-zinc-500 hover:text-red-400"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Add Event Dropdown */}
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        onChange={(e) => {
                                                            if (e.target.value && !festival.eventIds.includes(e.target.value)) {
                                                                updateFestival(festival.id, { eventIds: [...festival.eventIds, e.target.value] });
                                                                showToast('Event added to festival', 'success');
                                                            }
                                                            e.target.value = '';
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm"
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>+ Add event to festival...</option>
                                                        {events.filter(e => !festival.eventIds.includes(e.id)).map(event => (
                                                            <option key={event.id} value={event.id}>{event.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Email Templates */}
                {
                    activeTab === 'emails' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Email Templates
                                    </h2>
                                    <p className="text-zinc-400 text-sm">Customize automated emails sent to attendees</p>
                                </div>
                                {/* Bulk Send Button - Only for non-confirmation templates normally, but for now allow all */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            // Logic to open modal (we'll need to add the state/modal in next step)
                                            // For now, let's just use a prompt or simple alert to simulate the flow if we can't easily add state in one go
                                            // Better: We will add the state in a subsequent edit or assume it exists.
                                            // Let's actually add the functionality to OPEN the bulk sender here.
                                            // We need to inject the state first.
                                            // I will use a simple hack: Add a "Bulk Send" button that toggles a mode.
                                            setShowBulkEmailModal(true);
                                        }}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Send Campaign
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Email Modal */}
                            {showBulkEmailModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl w-full max-w-md overflow-hidden">
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-white mb-4">Send Email Campaign</h3>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Select Campaign Type</label>
                                                    <select
                                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                                                        onChange={(e) => setSelectedBulkTemplate(e.target.value)}
                                                    >
                                                        <option value="">Select a template...</option>
                                                        {emailTemplates.filter(t => t.isActive && t.type !== 'confirmation').map(t => (
                                                            <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Select Event to Target</label>
                                                    <select
                                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                                                        onChange={(e) => setSelectedBulkEvent(e.target.value)}
                                                    >
                                                        <option value="">Select an event...</option>
                                                        {events.filter(e => e.isActive).map(e => (
                                                            <option key={e.id} value={e.id}>{e.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Survey Selection (Conditional) */}
                                                {emailTemplates.find(t => t.id === selectedBulkTemplate)?.body.includes('{{surveyLink}}') && (
                                                    <div className="mb-4 animate-fade-in">
                                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Select Survey to Link</label>
                                                        <select
                                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                                                            value={selectedBulkSurvey}
                                                            onChange={(e) => setSelectedBulkSurvey(e.target.value)}
                                                        >
                                                            <option value="">Select a survey...</option>
                                                            {surveys.filter(s => s.isActive).map(s => (
                                                                <option key={s.id} value={s.id}>{s.title}</option>
                                                            ))}
                                                        </select>
                                                        <p className="text-xs text-zinc-500 mt-1">This survey link will replace {'{{surveyLink}}'} in the email.</p>
                                                    </div>
                                                )}

                                                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                                                    <p className="text-yellow-500 text-sm">
                                                        ⚠️ This will send emails to <strong>ALL paid attendees</strong> of the selected event immediately.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mt-8">
                                                <button
                                                    onClick={() => setShowBulkEmailModal(false)}
                                                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!selectedBulkEvent || !selectedBulkTemplate) {
                                                            showToast('Please select both event and template', 'error');
                                                            return;
                                                        }
                                                        if (confirm('Are you sure you want to send emails to all attendees?')) {
                                                            const res = await fetch('/api/admin/emails/bulk-send', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    eventId: selectedBulkEvent,
                                                                    templateId: selectedBulkTemplate,
                                                                    surveyId: selectedBulkSurvey // Pass selected survey ID
                                                                })
                                                            });
                                                            const data = await res.json();
                                                            if (data.success) {
                                                                showToast(data.message, 'success');
                                                                setShowBulkEmailModal(false);
                                                            } else {
                                                                showToast(data.error || 'Failed to send', 'error');
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                                                >
                                                    Send Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4">
                                {emailTemplates.map(template => (
                                    <div key={template.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${template.type === 'confirmation' ? 'bg-green-600/20 text-green-400' :
                                                    template.type === 'reminder' ? 'bg-blue-600/20 text-blue-400' :
                                                        template.type === 'thankyou' ? 'bg-purple-600/20 text-purple-400' :
                                                            'bg-zinc-700 text-zinc-400'
                                                    }`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        {template.type === 'confirmation' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                                        {template.type === 'reminder' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                                        {template.type === 'thankyou' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />}
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-white">{template.name}</h3>
                                                    <p className="text-xs text-zinc-500 capitalize">{template.type}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${template.isActive ? 'bg-green-600/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    {template.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <button
                                                    onClick={() => updateEmailTemplate(template.id, { isActive: !template.isActive })}
                                                    className="text-zinc-400 hover:text-white"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1">Subject</label>
                                                <input
                                                    type="text"
                                                    value={template.subject}
                                                    onChange={(e) => updateEmailTemplate(template.id, { subject: e.target.value })}
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-red-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 mb-1">Body</label>
                                                <textarea
                                                    value={template.body}
                                                    onChange={(e) => updateEmailTemplate(template.id, { body: e.target.value })}
                                                    rows={6}
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-red-500 focus:outline-none resize-none font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-xs text-zinc-500">Variables:</span>
                                                {['{{name}}', '{{eventName}}', '{{eventDate}}', '{{eventTime}}', '{{eventVenue}}', '{{ticketId}}', '{{siteName}}'].map(v => (
                                                    <code key={v} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">{v}</code>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Reviews */}
                {
                    activeTab === 'reviews' && (
                        <div className="space-y-6">
                            <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Select Event to View Reviews</h3>
                                <select
                                    value={sessionEventId || (events[0]?.id || '')}
                                    onChange={(e) => setSessionEventId(e.target.value)}
                                    className="w-full sm:w-1/3 px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none"
                                >
                                    {events.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                            <EventReviews eventId={sessionEventId || events[0]?.id} />
                        </div>
                    )
                }

                {/* Surveys */}
                {
                    activeTab === 'surveys' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Header and list column */}
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                </svg>
                                                Post-Event Surveys
                                            </h2>
                                            <p className="text-zinc-400 text-sm">Collect feedback from attendees after events</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const eventId = events[0]?.id || '';
                                                addSurvey({
                                                    id: `survey-${Date.now()}`,
                                                    eventId,
                                                    title: 'Event Feedback Survey',
                                                    description: 'We\'d love to hear your thoughts about the event!',
                                                    questions: [
                                                        { id: 'q1', question: 'How would you rate the overall event?', type: 'rating', required: true },
                                                        { id: 'q2', question: 'What did you enjoy most?', type: 'text', required: false },
                                                        { id: 'q3', question: 'Would you attend future events?', type: 'multipleChoice', options: ['Definitely!', 'Maybe', 'Unlikely'], required: true },
                                                    ],
                                                    isActive: true,
                                                    createdAt: new Date().toISOString(),
                                                });
                                                showToast('Survey created!', 'success');
                                            }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Create Survey
                                        </button>
                                    </div>

                                    {surveys.length === 0 ? (
                                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                                            <svg className="w-16 h-16 text-zinc-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                            <p className="text-zinc-400 mb-2">No surveys yet</p>
                                            <p className="text-zinc-500 text-sm">Create a survey to collect feedback after your events</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {surveys.map(survey => {
                                                const surveyEvent = events.find(e => e.id === survey.eventId);
                                                return (
                                                    <div key={survey.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                                        <div className="p-5 border-b border-zinc-800">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <input
                                                                        type="text"
                                                                        value={survey.title}
                                                                        onChange={(e) => updateSurvey(survey.id, { title: e.target.value })}
                                                                        className="font-semibold text-white bg-transparent border-none outline-none w-full focus:bg-zinc-800 focus:px-2 rounded"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={survey.description}
                                                                        onChange={(e) => updateSurvey(survey.id, { description: e.target.value })}
                                                                        className="text-sm text-zinc-500 mt-1 bg-transparent border-none outline-none w-full focus:bg-zinc-800 focus:px-2 rounded"
                                                                    />
                                                                    <p className="text-xs text-zinc-600 mt-2">Event: {surveyEvent?.name || 'Unknown'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => updateSurvey(survey.id, { isActive: !survey.isActive })}
                                                                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${survey.isActive ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                                                                    >
                                                                        {survey.isActive ? 'Active' : 'Inactive'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteSurvey(survey.id)}
                                                                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-500/10"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                {survey.questions.map((question, idx) => (
                                                                    <div key={question.id || idx} className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800 group transition-all hover:border-zinc-700">
                                                                        <div className="flex flex-col gap-3">
                                                                            <div className="flex gap-3 items-start">
                                                                                <span className="text-zinc-500 py-2.5 font-mono text-sm">#{idx + 1}</span>
                                                                                <div className="flex-1 space-y-3">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={question.question}
                                                                                        onChange={(e) => {
                                                                                            const newQs = [...survey.questions];
                                                                                            newQs[idx] = { ...newQs[idx], question: e.target.value };
                                                                                            updateSurvey(survey.id, { questions: newQs });
                                                                                        }}
                                                                                        placeholder="Enter question text..."
                                                                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                                                                                    />
                                                                                    <div className="flex gap-4 items-center">
                                                                                        <select
                                                                                            value={question.type}
                                                                                            onChange={(e) => {
                                                                                                const newQs = [...survey.questions];
                                                                                                newQs[idx] = { ...newQs[idx], type: e.target.value as any };
                                                                                                updateSurvey(survey.id, { questions: newQs });
                                                                                            }}
                                                                                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                                                                                        >
                                                                                            <option value="text">Short Text</option>
                                                                                            <option value="longText">Long Text</option>
                                                                                            <option value="rating">Rating (5 Stars)</option>
                                                                                            <option value="multipleChoice">Multiple Choice</option>
                                                                                        </select>

                                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={question.required}
                                                                                                onChange={(e) => {
                                                                                                    const newQs = [...survey.questions];
                                                                                                    newQs[idx] = { ...newQs[idx], required: e.target.checked };
                                                                                                    updateSurvey(survey.id, { questions: newQs });
                                                                                                }}
                                                                                                className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500"
                                                                                            />
                                                                                            <span className="text-xs text-zinc-400 select-none">Required</span>
                                                                                        </label>
                                                                                    </div>

                                                                                    {question.type === 'multipleChoice' && (
                                                                                        <div className="pt-1">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={question.options?.join(', ') || ''}
                                                                                                onChange={(e) => {
                                                                                                    const newQs = [...survey.questions];
                                                                                                    newQs[idx] = { ...newQs[idx], options: e.target.value.split(',').map(s => s.trim()) };
                                                                                                    updateSurvey(survey.id, { questions: newQs });
                                                                                                }}
                                                                                                placeholder="Option 1, Option 2, Option 3 (comma separated)"
                                                                                                className="w-full bg-zinc-900 border border-zinc-800 border-dashed rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newQs = survey.questions.filter((_, i) => i !== idx);
                                                                                        updateSurvey(survey.id, { questions: newQs });
                                                                                    }}
                                                                                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                                                                                    title="Remove Question"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    onClick={() => {
                                                                        const newQs: SurveyQuestion[] = [...survey.questions, { id: `q-${Date.now()}`, question: '', type: 'text' as const, required: false }];
                                                                        updateSurvey(survey.id, { questions: newQs });
                                                                    }}
                                                                    className="w-full py-3 border-2 border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                                    Add Question
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Google Sheets Config Column - Column 2 */}
                                <div className="bg-[#141414] border border-[#1F1F1F] rounded-xl p-6 h-fit sticky top-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-green-900/20 flex items-center justify-center text-green-500">
                                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Google Sheets Sync</h3>
                                            <p className="text-xs text-zinc-400">Auto-save responses to a spreadsheet</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800 mb-2">
                                            <p className="text-xs text-zinc-500 leading-relaxed">
                                                To enable sync, Create a Project in Google Cloud Console, enable "Google Sheets API", create a Service Account, and paste the JSON details below.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Sheet ID</label>
                                            <input
                                                type="text"
                                                value={googleSheetId}
                                                onChange={(e) => setGoogleSheetId(e.target.value)}
                                                placeholder="1BxiMVs0XRA5nFMdKbBdB_..."
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Service Account Email</label>
                                            <input
                                                type="text"
                                                value={serviceAccountEmail}
                                                onChange={(e) => setServiceAccountEmail(e.target.value)}
                                                placeholder="service-account@project.iam.gserviceaccount.com"
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Private Key</label>
                                            <textarea
                                                rows={3}
                                                value={privateKey}
                                                onChange={(e) => setPrivateKey(e.target.value)}
                                                placeholder="-----BEGIN PRIVATE KEY-----..."
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none font-mono text-xs"
                                            ></textarea>
                                        </div>
                                        <button
                                            onClick={saveGoogleSheetsConfig}
                                            disabled={isSavingSheets}
                                            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700 flex justify-center items-center gap-2"
                                        >
                                            {isSavingSheets ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    Saving...
                                                </>
                                            ) : 'Save Configuration'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }



                {/* Sales Control */}
                {
                    activeTab === 'sales' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <Power className="w-6 h-6 text-red-500" />
                                        Sales Control
                                    </h2>
                                    <p className="text-zinc-400 text-sm">Manage ticket sales globally and per-event</p>
                                </div>
                            </div>

                            {/* Global Emergency Stop */}
                            <div className={`bg-zinc-900 border rounded-xl p-6 ${siteSettings.globalSalesPaused ? 'border-red-500/50' : 'border-zinc-800'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${siteSettings.globalSalesPaused ? 'bg-red-600/20' : 'bg-green-600/20'}`}>
                                            {siteSettings.globalSalesPaused ? (
                                                <Pause className="w-7 h-7 text-red-400" />
                                            ) : (
                                                <Play className="w-7 h-7 text-green-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">Global Sales Status</h3>
                                            <p className={`text-sm ${siteSettings.globalSalesPaused ? 'text-red-400' : 'text-green-400'}`}>
                                                {siteSettings.globalSalesPaused ? '⏸ All sales are PAUSED' : '▶ Sales are ACTIVE'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSiteSettings({ globalSalesPaused: !siteSettings.globalSalesPaused })}
                                        className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${siteSettings.globalSalesPaused
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-red-600 hover:bg-red-700 text-white'
                                            }`}
                                    >
                                        {siteSettings.globalSalesPaused ? (
                                            <>
                                                <Play className="w-5 h-5" />
                                                Resume All Sales
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="w-5 h-5" />
                                                Emergency Stop
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Maintenance Message */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-red-500" />
                                    Maintenance Message
                                </h3>
                                <p className="text-zinc-500 text-sm mb-3">Shown to users when sales are paused</p>
                                <textarea
                                    value={siteSettings.maintenanceMessage}
                                    onChange={(e) => updateSiteSettings({ maintenanceMessage: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-red-500 focus:outline-none resize-none"
                                    placeholder="Sales are temporarily paused. Please check back soon!"
                                />
                            </div>

                            {/* Scheduled Maintenance */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-red-500" />
                                            Scheduled Maintenance
                                        </h3>
                                        <p className="text-zinc-500 text-sm">Plan downtime in advance</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (siteSettings.scheduledMaintenance) {
                                                updateSiteSettings({ scheduledMaintenance: null });
                                            } else {
                                                const now = new Date();
                                                const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                                                updateSiteSettings({
                                                    scheduledMaintenance: {
                                                        start: now.toISOString().slice(0, 16),
                                                        end: later.toISOString().slice(0, 16)
                                                    }
                                                });
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium ${siteSettings.scheduledMaintenance
                                            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {siteSettings.scheduledMaintenance ? 'Cancel Schedule' : '+ Schedule Maintenance'}
                                    </button>
                                </div>
                                {siteSettings.scheduledMaintenance && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Start Time</label>
                                            <input
                                                type="datetime-local"
                                                value={siteSettings.scheduledMaintenance.start}
                                                onChange={(e) => updateSiteSettings({
                                                    scheduledMaintenance: { ...siteSettings.scheduledMaintenance!, start: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">End Time</label>
                                            <input
                                                type="datetime-local"
                                                value={siteSettings.scheduledMaintenance.end}
                                                onChange={(e) => updateSiteSettings({
                                                    scheduledMaintenance: { ...siteSettings.scheduledMaintenance!, end: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Per-Event Sales Control */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-red-500" />
                                    Per-Event Sales Control
                                </h3>
                                <p className="text-zinc-500 text-sm mb-4">Toggle sales on/off for individual events</p>

                                <div className="space-y-3">
                                    {events.map(event => (
                                        <div key={event.id} className={`flex items-center justify-between p-4 rounded-xl border ${siteSettings.globalSalesPaused ? 'bg-zinc-900 border-red-500/20 opacity-75' : 'bg-zinc-800/50 border-transparent'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${event.isActive && !siteSettings.globalSalesPaused ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div>
                                                    <p className="font-medium text-white">{event.name}</p>
                                                    <p className="text-xs text-zinc-500">
                                                        {new Date(event.date).toLocaleDateString()} • {tickets.filter(t => t.eventId === event.id && t.status === 'paid').length}/{event.capacity} sold
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-medium ${event.isActive && !siteSettings.globalSalesPaused ? 'text-green-400' : 'text-red-400'}`}>
                                                    {siteSettings.globalSalesPaused ? 'PAUSED (GLOBAL)' : (event.isActive ? 'ON SALE' : 'PAUSED')}
                                                </span>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await fetch(`/api/events/${event.id}`, {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ isActive: !event.isActive })
                                                            });
                                                            updateEvent(event.id, { isActive: !event.isActive });
                                                            showToast(`Sales ${event.isActive ? 'paused' : 'resumed'} for ${event.name}`, 'success');
                                                        } catch {
                                                            showToast('Failed to update event', 'error');
                                                        }
                                                    }}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${event.isActive ? 'bg-green-600' : 'bg-zinc-700'}`}
                                                >
                                                    <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${event.isActive ? 'left-6' : 'left-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && (
                                        <div className="text-center py-8 text-zinc-500">
                                            No events found. Create events to control their sales.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Custom Pages */}
                {
                    activeTab === 'pages' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <FileText className="w-6 h-6 text-red-500" />
                                        Custom Pages
                                    </h2>
                                    <p className="text-zinc-400 text-sm">Create static pages like About, Contact, FAQ</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const newPage: CustomPage = {
                                            id: crypto.randomUUID(),
                                            slug: 'new-page',
                                            title: 'New Page',
                                            content: '<h1>New Page</h1>\n<p>Add your content here...</p>',
                                            isPublished: false,
                                            showInNav: false,
                                            order: siteSettings.customPages.length,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                        };
                                        updateSiteSettings({ customPages: [...siteSettings.customPages, newPage] });
                                        showToast('New page created', 'success');
                                    }}
                                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2 text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Page
                                </button>
                            </div>

                            {/* Page Templates */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                    </svg>
                                    <span className="text-sm font-medium text-white">Quick Templates</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { slug: 'privacy-policy', title: 'Privacy Policy', icon: <Shield className="w-4 h-4" />, content: `<h1>Privacy Policy</h1>\n<p>Last updated: ${new Date().toLocaleDateString()}</p>\n\n<h2>Information We Collect</h2>\n<p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.</p>\n\n<h2>How We Use Your Information</h2>\n<p>We use the information we collect to provide, maintain, and improve our services, process transactions, and send you technical notices and support messages.</p>\n\n<h2>Information Sharing</h2>\n<p>We do not share your personal information with third parties except as described in this policy or with your consent.</p>\n\n<h2>Contact Us</h2>\n<p>If you have any questions about this Privacy Policy, please contact us.</p>` },
                                        { slug: 'terms-of-service', title: 'Terms of Service', icon: <FileText className="w-4 h-4" />, content: `<h1>Terms of Service</h1>\n<p>Last updated: ${new Date().toLocaleDateString()}</p>\n\n<h2>Acceptance of Terms</h2>\n<p>By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.</p>\n\n<h2>Use License</h2>\n<p>Permission is granted to temporarily access the materials on our website for personal, non-commercial transitory viewing only.</p>\n\n<h2>Ticket Purchases</h2>\n<p>All ticket sales are final. Refunds may be issued at the discretion of the event organizer.</p>\n\n<h2>Disclaimer</h2>\n<p>The materials on this website are provided on an 'as is' basis.</p>` },
                                        { slug: 'refund-policy', title: 'Refund Policy', icon: <Receipt className="w-4 h-4" />, content: `<h1>Refund Policy</h1>\n<p>Last updated: ${new Date().toLocaleDateString()}</p>\n\n<h2>General Policy</h2>\n<p>Tickets purchased through our platform are generally non-refundable unless the event is cancelled by the organizer.</p>\n\n<h2>Event Cancellation</h2>\n<p>If an event is cancelled, refunds will be processed automatically within 5-7 business days.</p>\n\n<h2>Event Rescheduling</h2>\n<p>If an event is rescheduled, your ticket will remain valid for the new date. If you cannot attend, contact us for refund options.</p>\n\n<h2>Contact</h2>\n<p>For refund inquiries, please contact our support team.</p>` },
                                        { slug: 'contact', title: 'Contact Us', icon: <Mail className="w-4 h-4" />, content: `<h1>Contact Us</h1>\n<p>We'd love to hear from you! Get in touch with us through any of the methods below.</p>\n\n<h2>Email</h2>\n<p>support@example.com</p>\n\n<h2>Phone</h2>\n<p>+91 XXXXXXXXXX</p>\n\n<h2>Address</h2>\n<p>123 Event Street<br/>City, State 12345</p>\n\n<h2>Business Hours</h2>\n<p>Monday - Friday: 9:00 AM - 6:00 PM<br/>Saturday - Sunday: Closed</p>` },
                                        { slug: 'faq', title: 'FAQ', icon: <MessageSquare className="w-4 h-4" />, content: `<h1>Frequently Asked Questions</h1>\n\n<h2>How do I purchase tickets?</h2>\n<p>Browse our events, select the one you want to attend, and click "Get Tickets". Follow the checkout process to complete your purchase.</p>\n\n<h2>How do I access my tickets?</h2>\n<p>After purchase, you'll receive an email with your ticket and QR code. You can also access your tickets through your account.</p>\n\n<h2>Can I transfer my ticket to someone else?</h2>\n<p>Ticket transferability depends on the event organizer's policy. Contact us for assistance.</p>\n\n<h2>What if I lose my ticket?</h2>\n<p>Don't worry! Log into your account to re-download your ticket, or contact our support team.</p>` },
                                        { slug: 'about', title: 'About Us', icon: <Users className="w-4 h-4" />, content: `<h1>About Us</h1>\n<p>Welcome to EventHub - your premier destination for discovering and attending amazing events!</p>\n\n<h2>Our Mission</h2>\n<p>We're passionate about connecting people with unforgettable experiences. Our platform makes it easy to discover, book, and enjoy the best events in your area.</p>\n\n<h2>Our Story</h2>\n<p>Founded in 2024, we set out to revolutionize the way people discover and attend events. What started as a small project has grown into a platform serving thousands of event-goers.</p>\n\n<h2>Join Us</h2>\n<p>Whether you're an event organizer or an attendee, we'd love to have you as part of our community!</p>` },
                                    ].map(template => (
                                        <button
                                            key={template.slug}
                                            onClick={() => {
                                                const existingPage = siteSettings.customPages.find(p => p.slug === template.slug);
                                                if (existingPage) {
                                                    showToast(`${template.title} page already exists`, 'error');
                                                    return;
                                                }
                                                const newPage: CustomPage = {
                                                    id: crypto.randomUUID(),
                                                    slug: template.slug,
                                                    title: template.title,
                                                    content: template.content,
                                                    isPublished: false,
                                                    showInNav: false,
                                                    order: siteSettings.customPages.length,
                                                    createdAt: new Date().toISOString(),
                                                    updatedAt: new Date().toISOString(),
                                                };
                                                updateSiteSettings({ customPages: [...siteSettings.customPages, newPage] });
                                                showToast(`${template.title} page created`, 'success');
                                            }}
                                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm flex items-center gap-1.5 border border-zinc-700"
                                        >
                                            {template.icon}
                                            {template.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {siteSettings.customPages.length === 0 ? (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                                    <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No custom pages yet</h3>
                                    <p className="text-zinc-500 text-sm">Create pages like About, Contact, FAQ, Terms & Conditions</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {siteSettings.customPages.map((page, idx) => (
                                        <div key={page.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <GripVertical className="w-5 h-5 text-zinc-600 cursor-grab" />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${page.isPublished ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                            <h3 className="font-medium text-white">{page.title}</h3>
                                                        </div>
                                                        <p className="text-xs text-zinc-500 mt-1">/p/{page.slug}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const updated = siteSettings.customPages.map(p =>
                                                                p.id === page.id ? { ...p, isPublished: !p.isPublished, updatedAt: new Date().toISOString() } : p
                                                            );
                                                            updateSiteSettings({ customPages: updated });
                                                        }}
                                                        className={`p-2 rounded-lg ${page.isPublished ? 'bg-green-600/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}
                                                        title={page.isPublished ? 'Published' : 'Draft'}
                                                    >
                                                        {page.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const updated = siteSettings.customPages.filter(p => p.id !== page.id);
                                                            updateSiteSettings({ customPages: updated });
                                                            showToast('Page deleted', 'success');
                                                        }}
                                                        className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">Title</label>
                                                    <input
                                                        type="text"
                                                        value={page.title}
                                                        onChange={(e) => {
                                                            const updated = siteSettings.customPages.map(p =>
                                                                p.id === page.id ? { ...p, title: e.target.value, updatedAt: new Date().toISOString() } : p
                                                            );
                                                            updateSiteSettings({ customPages: updated });
                                                        }}
                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">URL Slug</label>
                                                    <div className="flex items-center">
                                                        <span className="px-3 py-2 bg-zinc-800/50 border border-r-0 border-zinc-700 rounded-l-lg text-zinc-500 text-sm">/p/</span>
                                                        <input
                                                            type="text"
                                                            value={page.slug}
                                                            onChange={(e) => {
                                                                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                                                                const updated = siteSettings.customPages.map(p =>
                                                                    p.id === page.id ? { ...p, slug, updatedAt: new Date().toISOString() } : p
                                                                );
                                                                updateSiteSettings({ customPages: updated });
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-r-lg text-white text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-xs text-zinc-500 mb-1">Content (HTML)</label>
                                                <RichTextEditor
                                                    value={page.content}
                                                    onChange={(value) => {
                                                        const updated = siteSettings.customPages.map(p =>
                                                            p.id === page.id ? { ...p, content: value, updatedAt: new Date().toISOString() } : p
                                                        );
                                                        updateSiteSettings({ customPages: updated });
                                                    }}
                                                    placeholder="Write your page content here..."
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={page.showInNav}
                                                        onChange={(e) => {
                                                            const updated = siteSettings.customPages.map(p =>
                                                                p.id === page.id ? { ...p, showInNav: e.target.checked, updatedAt: new Date().toISOString() } : p
                                                            );
                                                            updateSiteSettings({ customPages: updated });
                                                        }}
                                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500"
                                                    />
                                                    <span className="text-sm text-zinc-400">Show in navigation</span>
                                                </label>
                                                <a
                                                    href={`/p/${page.slug}`}
                                                    target="_blank"
                                                    className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Preview
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Theme Builder */}



                {/* Settings */}


                {/* Layout Tab */}
                {
                    activeTab === 'layout' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                        </svg>
                                        Page Layout Control
                                    </h2>
                                    <p className="text-zinc-400 text-sm">Customize how your site looks and functions</p>
                                </div>
                            </div>

                            {/* Home Page Layout */}
                            <LayoutManager />



                            {/* Event Page Settings */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Event Page Sections
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {[
                                        { key: 'showEventSchedule', label: 'Schedule', desc: 'Show event schedule/timeline' },
                                        { key: 'showEventReviews', label: 'Reviews', desc: 'Show reviews section' },
                                        { key: 'showEventShare', label: 'Share Buttons', desc: 'Show social share buttons' },
                                        { key: 'showEventCalendar', label: 'Add to Calendar', desc: 'Show calendar buttons' },
                                        { key: 'showEventCountdown', label: 'Countdown', desc: 'Show countdown timer' },
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                                            <div>
                                                <p className="font-medium text-white text-sm">{item.label}</p>
                                                <p className="text-xs text-zinc-500">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => updateSiteSettings({ [item.key]: !siteSettings[item.key as keyof SiteSettings] })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${siteSettings[item.key as keyof SiteSettings] ? 'bg-red-600' : 'bg-zinc-700'}`}
                                            >
                                                <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${siteSettings[item.key as keyof SiteSettings] ? 'left-5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Announcement Banner */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                    </svg>
                                    Announcement Banner
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                        <div>
                                            <p className="font-medium text-white">Enable Banner</p>
                                            <p className="text-sm text-zinc-500">Show announcement at top of site</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (siteSettings.announcement) {
                                                    updateSiteSettings({ announcement: { ...siteSettings.announcement, isActive: !siteSettings.announcement.isActive } });
                                                } else {
                                                    updateSiteSettings({ announcement: { id: `ann-${Date.now()}`, message: '', bgColor: '#dc2626', textColor: '#ffffff', isActive: true } });
                                                }
                                            }}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.announcement?.isActive ? 'bg-red-600' : 'bg-zinc-700'}`}
                                        >
                                            <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.announcement?.isActive ? 'left-6' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                    {siteSettings.announcement?.isActive && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-zinc-400 mb-1">Message (supports HTML)</label>
                                                <RichTextEditor
                                                    value={siteSettings.announcement?.message || ''}
                                                    onChange={(value) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, message: value } })}
                                                    placeholder="e.g. 🎉 New Year Sale - 20% off all events!"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Link Text (optional)</label>
                                                    <input
                                                        type="text"
                                                        value={siteSettings.announcement?.linkText || ''}
                                                        onChange={(e) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, linkText: e.target.value } })}
                                                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm"
                                                        placeholder="Learn more"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Link URL</label>
                                                    <input
                                                        type="text"
                                                        value={siteSettings.announcement?.linkUrl || ''}
                                                        onChange={(e) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, linkUrl: e.target.value } })}
                                                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm"
                                                        placeholder="/events"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Background Color</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="color"
                                                            value={siteSettings.announcement?.bgColor || '#dc2626'}
                                                            onChange={(e) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, bgColor: e.target.value } })}
                                                            className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={siteSettings.announcement?.bgColor || '#dc2626'}
                                                            onChange={(e) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, bgColor: e.target.value } })}
                                                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Text Color</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="color"
                                                            value={siteSettings.announcement?.textColor || '#ffffff'}
                                                            onChange={(e) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, textColor: e.target.value } })}
                                                            className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={siteSettings.announcement?.textColor || '#ffffff'}
                                                            onChange={(e) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, textColor: e.target.value } })}
                                                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Preview */}
                                            {siteSettings.announcement?.message && (
                                                <div className="mt-4">
                                                    <p className="text-xs text-zinc-500 mb-2">Preview:</p>
                                                    <div
                                                        className="px-4 py-2 rounded-xl text-center text-sm font-medium"
                                                        style={{ backgroundColor: siteSettings.announcement?.bgColor, color: siteSettings.announcement?.textColor }}
                                                    >
                                                        <span dangerouslySetInnerHTML={{ __html: siteSettings.announcement?.message || '' }} />
                                                        {siteSettings.announcement?.linkText && (
                                                            <span className="ml-2 underline cursor-pointer">{siteSettings.announcement?.linkText}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Settings */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    Footer
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Footer Text</label>
                                        <input
                                            type="text"
                                            value={siteSettings.footerText || ''}
                                            onChange={(e) => updateSiteSettings({ footerText: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                                            placeholder="© 2024 Your Company. All rights reserved."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Legal Links */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                    </svg>
                                    Legal Links
                                </h3>
                                <p className="text-zinc-500 text-sm mb-4">Link your custom pages to display as legal documents in the footer</p>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {[
                                        { key: 'privacyPolicy', label: 'Privacy Policy', icon: <Shield className="w-5 h-5 text-blue-400" /> },
                                        { key: 'termsOfService', label: 'Terms of Service', icon: <FileText className="w-5 h-5 text-purple-400" /> },
                                        { key: 'refundPolicy', label: 'Refund Policy', icon: <Receipt className="w-5 h-5 text-green-400" /> },
                                        { key: 'cookiePolicy', label: 'Cookie Policy', icon: <Globe className="w-5 h-5 text-orange-400" /> },
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                                            {item.icon}
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-white mb-1">{item.label}</label>
                                                <select
                                                    value={(siteSettings.legalPages as any)?.[item.key] || ''}
                                                    onChange={(e) => updateSiteSettings({
                                                        legalPages: { ...siteSettings.legalPages, [item.key]: e.target.value }
                                                    })}
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm"
                                                >
                                                    <option value="">— Select a page —</option>
                                                    {siteSettings.customPages.filter(p => p.isPublished).map(page => (
                                                        <option key={page.id} value={page.id}>{page.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {siteSettings.customPages.length === 0 && (
                                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-xl">
                                        <p className="text-sm text-yellow-400">
                                            No custom pages found. Go to the <strong>Pages</strong> tab to create legal pages first.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Logo Management (Moved from Settings) */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Logo Management
                                </h3>
                                <p className="text-zinc-500 text-sm mb-4">Upload your site logo and favicon</p>

                                <div className="grid sm:grid-cols-2 gap-6">
                                    {/* Site Logo */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Site Logo</label>
                                        <div>
                                            <ImageUpload
                                                value={siteSettings.logoUrl || ''}
                                                onChange={(url) => updateSiteSettings({ logoUrl: url })}
                                                placeholder="Upload Logo"
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">Recommended: 200x50px PNG</p>
                                        </div>
                                    </div>

                                    {/* Favicon */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Favicon</label>
                                        <div>
                                            <ImageUpload
                                                value={siteSettings.faviconUrl || ''}
                                                onChange={(url) => updateSiteSettings({ faviconUrl: url })}
                                                placeholder="Upload Favicon"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }




                {
                    activeTab === 'analytics' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Sales Dashboard
                            </h2>

                            {/* Revenue Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-green-900/50 to-green-900/20 border border-green-800/50 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-green-600/30 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-green-300 text-sm">Total Revenue</span>
                                    </div>
                                    <p className="text-3xl font-bold text-white">₹{(tickets.reduce((sum, t) => sum + (events.find(e => e.id === t.eventId)?.price || 0), 0) / 100).toLocaleString()}</p>
                                    <p className="text-green-400 text-sm mt-1">From {tickets.length} tickets</p>
                                </div>

                                <div className="bg-gradient-to-br from-blue-900/50 to-blue-900/20 border border-blue-800/50 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                            </svg>
                                        </div>
                                        <span className="text-blue-300 text-sm">Tickets Sold</span>
                                    </div>
                                    <p className="text-3xl font-bold text-white">{tickets.filter(t => t.status === 'paid').length}</p>
                                    <p className="text-blue-400 text-sm mt-1">Across {events.length} events</p>
                                </div>

                                <div className="bg-gradient-to-br from-purple-900/50 to-purple-900/20 border border-purple-800/50 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <span className="text-purple-300 text-sm">Avg. Ticket Price</span>
                                    </div>
                                    <p className="text-3xl font-bold text-white">₹{Math.round(events.filter(e => e).reduce((s, e) => s + e.price, 0) / events.filter(e => e).length / 100).toLocaleString()}</p>
                                    <p className="text-purple-400 text-sm mt-1">Per ticket</p>
                                </div>

                                <div className="bg-gradient-to-br from-orange-900/50 to-orange-900/20 border border-orange-800/50 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-orange-600/30 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-orange-300 text-sm">Sell-Through Rate</span>
                                    </div>
                                    <p className="text-3xl font-bold text-white">
                                        {Math.round((tickets.filter(t => t.status === 'paid').length / events.reduce((acc, e) => acc + (e.capacity || 0), 0)) * 100) || 0}%
                                    </p>
                                    <p className="text-orange-400 text-sm mt-1">Capacity utilization</p>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Revenue by Event */}
                                <ChartCard title="Revenue by Event">
                                    <BarChart data={events.filter(e => e).slice(0, 5).map(e => ({
                                        name: e.name.slice(0, 15) + '...',
                                        revenue: Math.round((tickets.filter(t => t.eventId === e.id && t.status === 'paid').length * e.price) / 100)
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                        <YAxis tick={{ fill: '#9ca3af' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                        <Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartCard>

                                {/* Category Distribution */}
                                <ChartCard title="Sales by Category">
                                    <PieChart>
                                        <Pie
                                            data={Object.keys(CATEGORY_COLORS).filter(c => c !== 'other').map(cat => ({
                                                name: cat.charAt(0).toUpperCase() + cat.slice(1),
                                                value: events.filter(e => e && e.category === cat).reduce((s, e) => s + tickets.filter(t => t.eventId === e.id && t.status === 'paid').length, 0)
                                            })).filter(c => c.value > 0)}
                                            cx="50%" cy="50%" outerRadius={80} dataKey="value" label
                                        >
                                            {Object.keys(CATEGORY_COLORS).map((_, i) => <Cell key={i} fill={['#dc2626', '#3b82f6', '#ec4899', '#22c55e', '#f97316', '#8b5cf6'][i % 6]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                    </PieChart>
                                </ChartCard>
                            </div>

                            {/* Sales Table */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-zinc-800">
                                    <h3 className="text-lg font-semibold text-white">Event Sales Performance</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Event</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Price</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Sold</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Capacity</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Revenue</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Fill Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {events.filter(e => e).map(event => (
                                                <tr key={event.id} className="hover:bg-zinc-800/30">
                                                    <td className="px-4 py-3 text-sm text-white">{event.name}</td>
                                                    <td className="px-4 py-3 text-sm text-zinc-300">₹{(event.price / 100).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-zinc-300">
                                                        {tickets.filter(t => t.eventId === event.id && t.status === 'paid').length}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-zinc-300">{event.capacity}</td>
                                                    <td className="px-4 py-3 text-sm text-green-400 font-medium">
                                                        ₹{((tickets.filter(t => t.eventId === event.id && t.status === 'paid').length * event.price) / 100).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${(tickets.filter(t => t.eventId === event.id && t.status === 'paid').length / event.capacity) >= 0.9 ? 'bg-red-500' : (tickets.filter(t => t.eventId === event.id && t.status === 'paid').length / event.capacity) >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                                    style={{ width: `${Math.min((tickets.filter(t => t.eventId === event.id && t.status === 'paid').length / event.capacity) * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-zinc-400">{Math.round((tickets.filter(t => t.eventId === event.id && t.status === 'paid').length / event.capacity) * 100)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Analytics Tab */}
                {
                    activeTab === 'analytics' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-6">Sales by Event</h3>
                                <div className="h-80 w-full min-h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={salesByEvent}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="name" stroke="#666" />
                                            <YAxis stroke="#666" />
                                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                            <Bar dataKey="tickets" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-6">Revenue by Event</h3>
                                <div className="h-80 w-full min-h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={salesByEvent}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="name" stroke="#666" />
                                            <YAxis stroke="#666" />
                                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                            <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'audit' && (
                        <div className="animate-fade-in-up">
                            <AuditLogViewer />
                        </div>
                    )
                }

                {
                    activeTab === 'integrations' && (
                        <div className="animate-fade-in-up">
                            <IntegrationHub />
                        </div>
                    )
                }

                {/* History Tab */}
                {
                    activeTab === 'history' && (
                        <div className="animate-fade-in-up">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Scan History</h2>
                                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors">
                                    <Copy className="w-4 h-4" /> Export All
                                </button>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Attendee</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Event</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Scan Time</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {tickets
                                                .filter(t => t.checkedIn)
                                                .sort((a, b) => new Date(b.checkedInAt || b.updatedAt || new Date()).getTime() - new Date(a.checkedInAt || a.updatedAt || new Date()).getTime())
                                                .slice(0, 50)
                                                .map(ticket => (
                                                    <tr key={ticket.id} className="hover:bg-zinc-800/30">
                                                        <td className="px-6 py-4">
                                                            <div className="text-white font-medium">{ticket.name}</div>
                                                            <div className="text-zinc-500 text-xs">{ticket.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-300">
                                                            {events.find(e => e.id === ticket.eventId)?.name || 'Unknown Event'}
                                                        </td>
                                                        <td className="px-6 py-4 text-zinc-300">
                                                            {new Date(ticket.checkedInAt || ticket.updatedAt || new Date()).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                                                                Checked In
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                    {tickets.filter(t => t.checkedIn).length === 0 && (
                                        <div className="py-12 text-center text-zinc-500">
                                            No recent scan history found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {showEventModal && <EventModal event={editingEvent} onSave={handleSaveEvent} onClose={() => { setShowEventModal(false); setEditingEvent(null); }} />}
            </div >
        </main >
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
    const colors = {
        blue: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
        green: 'bg-green-900/30 text-green-400 border-green-800/50',
        purple: 'bg-purple-900/30 text-purple-400 border-purple-800/50',
        red: 'bg-red-900/30 text-red-400 border-red-800/50'
    };
    return (
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${colors[color as keyof typeof colors]}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icon === 'ticket' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />}
                        {icon === 'check' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                        {icon === 'checkin' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
                        {icon === 'money' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                </div>
                <span className="text-[#B3B3B3] text-sm font-medium">{label}</span>
            </div>
            <p className="font-mono text-3xl font-bold text-white">{value}</p>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6 shadow-xl">
            <h3 className="font-heading text-lg font-semibold text-white mb-5">{title}</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
        </div>
    );
}


