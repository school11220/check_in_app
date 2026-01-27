'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, BarChart3, LogOut, Globe, Edit3, Save, Loader2, LayoutDashboard, Home, Ticket, CheckCircle, Power, Play, Pause, AlertTriangle, History, MessageSquare, Plus } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import SessionScheduler from '@/components/admin/SessionScheduler';

import EventAttendees from '@/components/organizer/EventAttendees';
import EventReviews from '@/components/organizer/EventReviews';
import EventModal from '@/components/EventModal';
import { useClerk } from '@clerk/nextjs';
import { Event } from '@/lib/store';



interface User {
    name: string;
    role: string;
    assignedEventIds: string[];
}

type TabId = 'overview' | 'events' | 'schedule' | 'attendees' | 'sales' | 'reviews';

export default function OrganizerDashboard() {
    const router = useRouter();
    const { showToast } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [saving, setSaving] = useState(false);

    const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

    useEffect(() => {
        checkSession();
    }, []);

    useEffect(() => {
        if (events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
        }
    }, [events]);





    const checkSession = async () => {
        try {
            const meRes = await fetch('/api/auth/me');
            if (meRes.ok) {
                const userData = await meRes.json();
                setUser(userData);
                fetchEvents(userData.assignedEventIds, userData.role);
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchEvents = async (assignedIds: string[], role: string) => {
        try {
            const res = await fetch('/api/events');
            if (res.ok) {
                const allEvents: Event[] = await res.json();
                if (role === 'ADMIN') {
                    setEvents(allEvents);
                } else {
                    setEvents(allEvents.filter(e => assignedIds.includes(e.id)));
                }
            }
        } catch (error) {
            console.error('Failed to fetch events', error);
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
        setSaving(true);
        try {
            const url = eventId ? `/api/events/${eventId}` : '/api/events';
            const method = eventId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                showToast(`Event ${eventId ? 'updated' : 'created'} successfully!`, 'success');
                if (user) await fetchEvents(user.assignedEventIds, user.role);
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

    if (loading) return (
        <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#E11D2E]" />
        </div>
    );

    const tabs = [
        { id: 'overview' as TabId, label: 'Overview', icon: LayoutDashboard },
        { id: 'events' as TabId, label: 'Events', icon: Calendar },
        { id: 'schedule' as TabId, label: 'Schedule', icon: Calendar },
        { id: 'sales' as TabId, label: 'Sales', icon: Power },
        { id: 'attendees' as TabId, label: 'Attendees', icon: Users },
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
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <img src="/favicon.png" alt="EventHub" className="w-10 h-10 rounded-xl" />
                            <div>
                                <h1 className="font-heading text-lg sm:text-xl font-bold text-white">Organizer</h1>
                                <p className="text-[#737373] text-xs sm:text-sm">Welcome, {user?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center text-[#B3B3B3] hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                                <Home className="w-4 h-4 mr-1.5" /> Home
                            </a>
                            <a href="/checkin" target="_blank" rel="noopener noreferrer" className="flex items-center text-[#B3B3B3] hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Check-In
                            </a>
                            <button onClick={handleLogout} className="flex items-center px-3 py-2 bg-[#141414] text-[#B3B3B3] rounded-xl hover:bg-[#1A1A1A] hover:text-white text-sm border border-[#1F1F1F] transition-colors">
                                <span className="hidden sm:inline mr-2">Logout</span>
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Event Selector (Global - for other tabs) */}
                    {activeTab !== 'events' && activeTab !== 'overview' && events.length > 0 && (
                        <select
                            value={selectedEventId || ''}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="w-full px-4 py-3 bg-[#141414] border border-[#1F1F1F] text-white rounded-xl text-sm mb-4"
                        >
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-2 text-sm ${activeTab === tab.id
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
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
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
                                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
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
                                        onClick={() => setActiveTab('attendees')}
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
                    </div>
                )}

                {/* Events Tab */}
                {activeTab === 'events' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Your Events</h2>
                            <button
                                onClick={() => {
                                    setEditingEvent(null);
                                    setShowEventModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-[#E11D2E] text-white rounded-xl hover:bg-[#B91C1C] transition-colors text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Create Event
                            </button>
                        </div>

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
                            globalView={true}
                        />
                    </div>
                )}

                {/* Sales Control Tab */}
                {activeTab === 'sales' && selectedEvent && (
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6 md:p-8 max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Sales Control</h2>
                            <p className="text-[#737373]">Manage availability for {selectedEvent.name}</p>
                        </div>

                        <div className={`border rounded-2xl p-8 transition-all ${selectedEvent.isActive
                            ? 'bg-[#1A1A1A] border-green-500/30'
                            : 'bg-[#1A1A1A] border-red-500/30'
                            }`}>

                            <div className="flex flex-col items-center justify-center text-center space-y-6">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${selectedEvent.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    <Power className="w-10 h-10" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {selectedEvent.isActive ? 'Sales are Live' : 'Sales Paused'}
                                    </h3>
                                    <p className="text-[#737373] text-sm max-w-sm mx-auto">
                                        {selectedEvent.isActive
                                            ? "Tickets are available for purchase."
                                            : "Ticket sales are halted. Resume when ready."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-medium ${!selectedEvent.isActive ? 'text-white' : 'text-[#737373]'}`}>Paused</span>
                                    <button
                                        onClick={async () => {
                                            if (saving) return;
                                            setSaving(true);
                                            try {
                                                const res = await fetch(`/api/events/${selectedEvent.id}`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ isActive: !selectedEvent.isActive }),
                                                });
                                                if (res.ok) {
                                                    showToast(`Sales ${!selectedEvent.isActive ? 'resumed' : 'paused'} successfully`, 'success');
                                                    if (user) fetchEvents(user.assignedEventIds, user.role);
                                                } else {
                                                    throw new Error();
                                                }
                                            } catch (e) {
                                                showToast('Failed to update status', 'error');
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                        disabled={saving}
                                        className={`w-16 h-8 rounded-full p-1 transition-colors relative ${selectedEvent.isActive ? 'bg-green-500' : 'bg-[#2A2A2A]'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out ${selectedEvent.isActive ? 'translate-x-8' : 'translate-x-0'
                                            }`} />
                                    </button>
                                    <span className={`text-sm font-medium ${selectedEvent.isActive ? 'text-white' : 'text-[#737373]'}`}>Active</span>
                                </div>
                            </div>
                        </div>
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
