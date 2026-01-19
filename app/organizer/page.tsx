'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, BarChart3, LogOut, Globe, Edit3, Save, Loader2, LayoutDashboard, Home, Ticket, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import SessionScheduler from '@/components/admin/SessionScheduler';
import EventIntegrations from '@/components/organizer/EventIntegrations';
import EventAttendees from '@/components/organizer/EventAttendees';

interface Event {
    id: string;
    name: string;
    description?: string;
    date: string;
    startTime?: string;
    endTime?: string;
    venue: string;
    address?: string;
    price: number;
    soldCount: number;
    capacity: number;
    category?: string;
    imageUrl?: string;
    videoLink?: string;
    organizerVideoLink?: string;
    organizer?: string;
    contactEmail?: string;
    contactPhone?: string;
}

interface User {
    name: string;
    role: string;
    assignedEventIds: string[];
}

type TabId = 'overview' | 'events' | 'edit' | 'schedule' | 'attendees' | 'integrations';

export default function OrganizerDashboard() {
    const router = useRouter();
    const { showToast } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Event>>({});
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

    useEffect(() => {
        if (selectedEvent) {
            setEditForm(selectedEvent);
        }
    }, [selectedEventId, events]);

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

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const handleSaveEvent = async () => {
        if (!selectedEvent) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/events/${selectedEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                showToast('Event updated successfully!', 'success');
                if (user) fetchEvents(user.assignedEventIds, user.role);
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to update', 'error');
            }
        } catch (e) {
            showToast('Failed to update event', 'error');
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
        { id: 'edit' as TabId, label: 'Edit', icon: Edit3 },
        { id: 'schedule' as TabId, label: 'Schedule', icon: Calendar },
        { id: 'attendees' as TabId, label: 'Attendees', icon: Users },
        { id: 'integrations' as TabId, label: 'Integrations', icon: Globe },
    ];

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
                            <a href="/" className="hidden sm:flex items-center text-[#B3B3B3] hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                                <Home className="w-4 h-4 mr-1.5" /> Home
                            </a>
                            <a href="/checkin" className="hidden sm:flex items-center text-[#B3B3B3] hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Check-In
                            </a>
                            <button onClick={handleLogout} className="flex items-center px-3 py-2 bg-[#141414] text-[#B3B3B3] rounded-xl hover:bg-[#1A1A1A] hover:text-white text-sm border border-[#1F1F1F] transition-colors">
                                <span className="hidden sm:inline mr-2">Logout</span>
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Event Selector */}
                    {events.length > 0 && (
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            <div className="bg-[#141414] border border-[#1F1F1F] p-5 rounded-2xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-[#E11D2E]/20 rounded-xl flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-[#E11D2E]" />
                                    </div>
                                    <span className="text-[#737373] text-sm">Total Revenue</span>
                                </div>
                                <p className="text-3xl font-bold text-white">₹{(events.reduce((acc, curr) => acc + (curr.price * curr.soldCount), 0) / 100).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {selectedEvent && (
                            <div className="bg-[#141414] border border-[#1F1F1F] p-5 rounded-2xl">
                                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <button
                                        onClick={() => router.push(`/checkin?event=${selectedEvent.id}`)}
                                        className="p-4 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl hover:bg-[#222] transition-colors text-center"
                                    >
                                        <Ticket className="w-6 h-6 mx-auto mb-2 text-[#E11D2E]" />
                                        <span className="text-sm text-white">Check-in</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('edit')}
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
                                        onClick={() => router.push(`/event/${selectedEvent.id}`)}
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
                                        setSelectedEventId(event.id);
                                        setActiveTab('edit');
                                    }}
                                    className={`bg-[#141414] border rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[#E11D2E]/50 ${selectedEventId === event.id ? 'border-[#E11D2E]' : 'border-[#1F1F1F]'}`}
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
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Edit Event Tab */}
                {activeTab === 'edit' && selectedEvent && (
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h2 className="text-lg font-semibold text-white">Edit: {selectedEvent.name}</h2>
                            <button
                                onClick={handleSaveEvent}
                                disabled={saving}
                                className="px-6 py-2.5 bg-[#E11D2E] text-white rounded-xl hover:bg-[#B91C1C] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Event Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Category</label>
                                    <select
                                        value={editForm.category || 'other'}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    >
                                        <option value="music">Music</option>
                                        <option value="tech">Tech</option>
                                        <option value="art">Art</option>
                                        <option value="sports">Sports</option>
                                        <option value="food">Food</option>
                                        <option value="gaming">Gaming</option>
                                        <option value="business">Business</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-[#737373] mb-1">Description</label>
                                <textarea
                                    value={editForm.description || ''}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white resize-none focus:border-[#E11D2E] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[#737373] mb-1">Image URL</label>
                                <input
                                    type="url"
                                    value={editForm.imageUrl || ''}
                                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={editForm.date?.split('T')[0] || ''}
                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={editForm.startTime || '09:00'}
                                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">End Time</label>
                                    <input
                                        type="time"
                                        value={editForm.endTime || '18:00'}
                                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Location */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Venue</label>
                                    <input
                                        type="text"
                                        value={editForm.venue || ''}
                                        onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={editForm.address || ''}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Pricing & Capacity */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Price (paise)</label>
                                    <input
                                        type="number"
                                        value={editForm.price || 0}
                                        onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[#737373] mb-1">Capacity</label>
                                    <input
                                        type="number"
                                        value={editForm.capacity || 0}
                                        onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Organizer Contact */}
                            <div className="border-t border-[#1F1F1F] pt-4">
                                <h4 className="text-sm font-medium text-[#737373] mb-3">Organizer Contact</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-[#737373] mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={editForm.organizer || ''}
                                            onChange={(e) => setEditForm({ ...editForm, organizer: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[#737373] mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={editForm.contactEmail || ''}
                                            onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[#737373] mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={editForm.contactPhone || ''}
                                            onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedule Tab */}
                {activeTab === 'schedule' && selectedEvent && (
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
                        <SessionScheduler
                            eventId={selectedEvent.id}
                            eventDate={selectedEvent.date}
                            showToast={showToast}
                            readOnly={false}
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

                {/* Integrations Tab */}
                {activeTab === 'integrations' && selectedEvent && (
                    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
                        <EventIntegrations
                            eventId={selectedEvent.id}
                            initialVideoLink={selectedEvent.videoLink}
                            initialOrganizerLink={selectedEvent.organizerVideoLink}
                            onClose={() => { }}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
