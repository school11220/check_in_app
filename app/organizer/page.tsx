'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {Calendar, Users, LogOut, Globe, Edit3, Save, Loader2, LayoutDashboard, Home, Ticket, CheckCircle, MessageSquare, RefreshCw} from '@/components/icons';
import { useToast } from '@/components/Toaster';
import SessionScheduler from '@/components/admin/SessionScheduler';

import EventAttendees from '@/components/organizer/EventAttendees';
import EventReviews from '@/components/organizer/EventReviews';
import EventModal from '@/components/EventModal';
import ScannerAssignmentManager from '@/components/ScannerAssignmentManager';
import CheckInPolicyManager from '@/components/CheckInPolicyManager';
import EventSettingsManager from '@/components/EventSettingsManager';
import { useClerk } from '@clerk/nextjs';
import { Event } from '@/lib/store';
import AttendeeSegments from '@/components/admin/AttendeeSegments';
import ReminderManager from '@/components/admin/ReminderManager';
import EventTemplateManager from '@/components/admin/EventTemplateManager';



interface User {
    name: string;
    role: string;
    assignedEventIds: string[];
}

type TabId = 'overview' | 'events' | 'schedule' | 'attendees' | 'segments' | 'reminders' | 'templates' | 'reviews';

export default function OrganizerDashboard({ defaultTab, defaultEventId }: { defaultTab?: TabId; defaultEventId?: string } = {}) {
    const router = useRouter();
    const { showToast } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>(defaultTab || 'overview');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(defaultEventId || null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');

    const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : events[0];

    useEffect(() => {
        checkSession();
    }, []);

    useEffect(() => {
        if (events.length > 0 && !selectedEventId) {
            changeEvent(events[0].id, false);
        }
    }, [events]);





    const checkSession = async () => {
        try {
            const meRes = await fetch('/api/auth/me');
            if (meRes.ok) {
                const userData = await meRes.json();
                setUser(userData);
                fetchEvents();
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await fetch('/api/dashboard/events?page=1&pageSize=100', { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load assigned events');
            setEvents(data.items || []);
        } catch (error) {
            console.error('Failed to fetch events', error);
            setLoadError(error instanceof Error ? error.message : 'Failed to load assigned events');
        } finally {
            setLoading(false);
        }
    };

    const { signOut } = useClerk();

    const handleLogout = async () => {
        await signOut({ redirectUrl: '/login' });
    };

    const handleSaveEvent = async (data: Partial<Event>) => {
        const eventId = editingEvent?.id;
        if (!eventId) {
            showToast('Only administrators can create events', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                showToast('Event updated successfully!', 'success');
                await fetchEvents();
                setShowEventModal(false);
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to save event', 'error');
            }
        } catch (e) {
            showToast('Failed to save event', 'error');
        } finally {
            setSaving(false);
        }
    };

    const workspaceUrl = (tab: TabId, event = selectedEventId) => `/organizer/${tab}${event ? `?event=${encodeURIComponent(event)}` : ''}`;
    const changeTab = (tab: TabId) => {
        setActiveTab(tab);
        router.push(workspaceUrl(tab));
    };
    const changeEvent = (eventId: string, navigate = true) => {
        setSelectedEventId(eventId);
        if (navigate) router.push(workspaceUrl(activeTab, eventId));
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#E11D2E]" />
        </div>
    );

    if (loadError) return <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center"><p className="mb-4 text-red-200">{loadError}</p><button onClick={fetchEvents} className="inline-flex items-center gap-2 rounded-xl bg-[#E11D2E] px-4 py-2"><RefreshCw className="h-4 w-4" />Retry</button></div></div>;

    const tabs = [
        { id: 'overview' as TabId, label: 'Overview', icon: LayoutDashboard },
        { id: 'events' as TabId, label: 'Events', icon: Calendar },
        { id: 'schedule' as TabId, label: 'Schedule', icon: Calendar },
        { id: 'attendees' as TabId, label: 'Attendees', icon: Users },
        { id: 'segments' as TabId, label: 'Segments', icon: Users },
        { id: 'reminders' as TabId, label: 'Reminders', icon: Calendar },
        { id: 'templates' as TabId, label: 'Templates', icon: Save },
        { id: 'reviews' as TabId, label: 'Reviews', icon: MessageSquare },
    ];

    // Reset view when switching tabs
    // Moved to top level useEffect


    return (
        <div className="min-h-screen bg-[#0B0B0B] text-white">
            {/* Header */}
            <div className="bg-[#0B0B0B] border-b border-[#1F1F1F] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    {/* Header Row */}
                    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <img src="/favicon.png" alt="EventHub" className="w-10 h-10 rounded-xl" />
                            <div>
                                <h1 className="font-heading text-lg sm:text-xl font-bold text-white">Organizer</h1>
                                <p className="text-[#737373] text-xs sm:text-sm">Welcome, {user?.name}</p>
                            </div>
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                            <a href="/" target="_blank" rel="noopener noreferrer" className="interactive-control flex flex-1 items-center justify-center text-[#B3B3B3] hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-white/5 transition-colors sm:flex-none sm:text-sm">
                                <Home className="w-4 h-4 mr-1.5" /> Home
                            </a>
                            <a href="/checkin" target="_blank" rel="noopener noreferrer" className="interactive-control flex flex-1 items-center justify-center text-[#B3B3B3] hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-white/5 transition-colors sm:flex-none sm:text-sm">
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Check-In
                            </a>
                            <button onClick={handleLogout} className="flex flex-1 items-center justify-center px-3 py-2 bg-[#141414] text-[#B3B3B3] rounded-xl hover:bg-[#1A1A1A] hover:text-white text-xs border border-[#1F1F1F] transition-colors sm:flex-none sm:text-sm">
                                <span className="hidden sm:inline mr-2">Logout</span>
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Event Selector (Global - for other tabs) */}
                    {events.length > 0 && (
                        <select
                            value={selectedEventId || ''}
                            onChange={(e) => changeEvent(e.target.value)}
                            className="w-full px-4 py-3 bg-[#141414] border border-[#1F1F1F] text-white rounded-xl text-sm mb-4"
                            aria-label="Selected event workspace"
                        >
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Tabs */}
                    <nav
                        aria-label="Organizer sections"
                        className="flex min-w-0 max-w-full flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
                    >
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => changeTab(tab.id)}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === tab.id
                                        ? 'bg-[#E11D2E] text-white shadow-[0_0_20px_rgba(225,29,46,0.3)]'
                                        : 'bg-[#141414] text-[#737373] hover:bg-[#1A1A1A] hover:text-[#B3B3B3] border border-[#1F1F1F]'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {selectedEventId && !selectedEvent && <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-100"><p className="font-semibold">Event unavailable</p><p className="mt-1 text-sm text-yellow-100/70">This event is not assigned to your account or no longer exists.</p><button onClick={() => { setSelectedEventId(null); router.replace('/organizer/overview'); }} className="mt-3 rounded-lg border border-yellow-500/40 px-3 py-2 text-sm">Choose an assigned event</button></div>}
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {selectedEvent && <div className="rounded-2xl border border-[#E11D2E]/30 bg-[#E11D2E]/10 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[#E11D2E]">Selected event workspace</p><h2 className="mt-1 text-xl font-bold">{selectedEvent.name}</h2><p className="mt-1 text-sm text-[#B3B3B3]">All attendee, schedule, review, reminder, and scanner actions below are scoped to this event.</p></div>}
                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#141414] border border-[#1F1F1F] p-5 rounded-2xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-[#E11D2E]/20 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-[#E11D2E]" />
                                    </div>
                                    <span className="text-[#737373] text-sm">Assigned Events</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{events.length}</p>
                            </div>
                            <div className="bg-[#141414] border border-[#1F1F1F] p-5 rounded-2xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-[#E11D2E]/20 rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5 text-[#E11D2E]" />
                                    </div>
                                    <span className="text-[#737373] text-sm">Total Attendees</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{events.reduce((acc, curr) => acc + curr.soldCount, 0)}</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {selectedEvent && (
                            <div className="bg-[#141414] border border-[#1F1F1F] p-5 rounded-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                                    <select
                                        value={selectedEvent.id}
                                        onChange={(event) => changeEvent(event.target.value)}
                                        className="px-3 py-2 bg-[#0D0D0D] border border-[#1F1F1F] text-white rounded-xl text-sm"
                                    >
                                        {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <button
                                        onClick={() => window.open(`/checkin?event=${selectedEvent.id}`, '_blank')}
                                        className="p-4 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl hover:bg-[#222] transition-colors text-center"
                                    >
                                        <Ticket className="w-6 h-6 mx-auto mb-2 text-[#E11D2E]" />
                                        <span className="text-sm text-white">Check-in</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingEvent(selectedEvent);
                                            setShowEventModal(true);
                                        }}
                                        className="p-4 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl hover:bg-[#222] transition-colors text-center"
                                    >
                                        <Edit3 className="w-6 h-6 mx-auto mb-2 text-[#E11D2E]" />
                                        <span className="text-sm text-white">Edit Event</span>
                                    </button>
                                    <button
                                        onClick={() => changeTab('attendees')}
                                        className="p-4 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl hover:bg-[#222] transition-colors text-center"
                                    >
                                        <Users className="w-6 h-6 mx-auto mb-2 text-[#E11D2E]" />
                                        <span className="text-sm text-white">Attendees</span>
                                    </button>
                                    <button
                                        onClick={() => window.open(`/event/${selectedEvent.id}`, '_blank')}
                                        className="p-4 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl hover:bg-[#222] transition-colors text-center"
                                    >
                                        <Globe className="w-6 h-6 mx-auto mb-2 text-[#E11D2E]" />
                                        <span className="text-sm text-white">Public Page</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {selectedEvent && <><CheckInPolicyManager eventId={selectedEvent.id} /><EventSettingsManager eventId={selectedEvent.id} /></>}
                        <ScannerAssignmentManager events={events} />
                    </div>
                )}

                {/* Events Tab */}
                {activeTab === 'events' && (
                    <>
                        <div className="mb-6"><h2 className="text-xl font-bold text-white">Assigned Events</h2><p className="mt-1 text-sm text-[#737373]">Event creation and sales controls are managed by administrators.</p></div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {events.length === 0 ? (
                                <div className="col-span-full text-center py-20 bg-[#141414] rounded-2xl border border-[#1F1F1F]">
                                    <p className="text-[#737373]">No events assigned to you yet.</p>
                                </div>
                            ) : (
                                events.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => {
                                            setEditingEvent(event);
                                            setShowEventModal(true);
                                        }}
                                        className={`bg-[#141414] border rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[#E11D2E]/50 border-[#1F1F1F]`}
                                    >
                                        <div className="h-32 bg-[#1A1A1A] relative">
                                            {event.imageUrl ? (
                                                <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[#737373]">No Image</div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded-full text-xs text-white">
                                                {new Date(event.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="text-base font-semibold text-white mb-1 truncate">{event.name}</h3>
                                            <p className="text-[#737373] text-sm mb-3 truncate">{event.venue}</p>
                                            <div className="flex justify-between text-sm text-[#737373]">
                                                <span>Sold: <span className="text-white">{event.soldCount}</span></span>
                                                <span>Cap: <span className="text-white">{event.capacity}</span></span>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-[#1F1F1F] text-xs text-[#E11D2E] font-medium flex items-center gap-1">
                                                <Edit3 className="w-3 h-3" /> Click to Edit
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Schedule Tab */}
                {activeTab === 'schedule' && selectedEvent && (
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
                        <SessionScheduler
                            eventId={selectedEvent.id}
                            eventDate={selectedEvent.date}
                            showToast={showToast}
                            readOnly={true}
                        />
                    </div>
                )}

                {/* Attendees Tab */}
                {activeTab === 'attendees' && selectedEvent && (
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
                        <EventAttendees
                            eventId={selectedEvent.id}
                            onClose={() => { }}
                        />
                    </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && selectedEvent && (
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Event Feedback</h2>
                            <span className="text-sm text-[#737373]">Live user reviews</span>
                        </div>
                        <EventReviews eventId={selectedEvent.id} />
                    </div>
                )}

                {activeTab === 'segments' && <AttendeeSegments events={events} />}
                {activeTab === 'reminders' && <ReminderManager events={events} />}
                {activeTab === 'templates' && <EventTemplateManager events={events} />}
            </main>

            {showEventModal && (
                <EventModal
                    event={editingEvent}
                    onSave={handleSaveEvent}
                    onClose={() => setShowEventModal(false)}
                    isOrganizer={true}
                />
            )}
        </div>
    );
}
