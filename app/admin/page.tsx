'use client';

import { useState, useEffect } from 'react';
import { useApp, CATEGORY_COLORS, Event, ScheduleItem, Speaker, Sponsor, TeamMember, TeamRole, ROLE_PERMISSIONS, SiteSettings, Festival, EmailTemplate, Survey, PromoCode, WaitlistEntry, Announcement, NavLink } from '@/lib/store';
import { useToast } from '@/components/Toaster';
import { useRouter } from 'next/navigation';
import AttendeeInsights from '@/components/AttendeeInsights';
import AdminPollManager from '@/components/AdminPollManager';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { LogOut, Home, CheckCircle, Search, Trash2, Edit, Copy, Plus, Users, Calendar, BarChart as BarChartIcon } from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();
    const { events, tickets, teamMembers, siteSettings, festivals, emailTemplates, surveys, promoCodes, waitlist, isAdminLoggedIn, loginAdmin, logoutAdmin, addEvent, updateEvent, deleteEvent, duplicateEvent, addTicket, updateTicket, deleteTicket, addTeamMember, updateTeamMember, removeTeamMember, updateSiteSettings, addFestival, updateFestival, deleteFestival, updateEmailTemplate, addSurvey, updateSurvey, deleteSurvey, addPromoCode, updatePromoCode, deletePromoCode, addToWaitlist, removeFromWaitlist, notifyWaitlist } = useApp();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'attendees' | 'team' | 'festivals' | 'emails' | 'surveys' | 'settings' | 'layout' | 'promo' | 'analytics' | 'polls' | 'history'>('overview');
    const [password, setPassword] = useState('');
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<string>('all');
    const [attendeeSearch, setAttendeeSearch] = useState('');
    const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked' | 'unchecked'>('all');
    const [liveStats, setLiveStats] = useState({ online: 127, checkinsToday: 23 });

    useEffect(() => {
        const interval = setInterval(() => {
            setLiveStats({ online: Math.floor(100 + Math.random() * 50), checkinsToday: Math.floor(20 + Math.random() * 10) });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginAdmin(password)) showToast('Login successful!', 'success');
        else showToast('Invalid password', 'error');
        setPassword('');
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
    const totalRevenue = filteredTickets.filter(t => t.status === 'paid').reduce((sum, t) => {
        const event = events.find(e => e.id === t.eventId);
        return sum + (event?.price || 0);
    }, 0);

    const salesByEvent = events.map(event => ({
        name: (event?.name || 'Unknown').split(' ')[0],
        tickets: tickets.filter(t => t.eventId === event?.id && t.status === 'paid').length,
        revenue: (tickets.filter(t => t.eventId === event?.id && t.status === 'paid').length * (event?.price || 0)) / 100,
    }));

    const checkInData = [{ name: 'Checked In', value: checkedIn }, { name: 'Pending', value: paidTickets - checkedIn }];

    const handleSaveEvent = (eventData: Partial<Event>) => {
        if (editingEvent) {
            updateEvent(editingEvent.id, eventData);
            showToast('Event updated!', 'success');
        } else {
            const newEvent: Event = {
                id: `event-${Date.now()}`,
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
                // Early Bird Pricing
                earlyBirdEnabled: eventData.earlyBirdEnabled || false,
                earlyBirdPrice: eventData.earlyBirdPrice || 0,
                earlyBirdDeadline: eventData.earlyBirdDeadline || '',
                // Event Reminders
                sendReminders: eventData.sendReminders ?? true,
            };
            addEvent(newEvent);
            showToast('Event created!', 'success');
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
        a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast('CSV exported!', 'success');
    };

    if (!isAdminLoggedIn) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl mb-4">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">EventHub Admin</h1>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-lg tracking-widest" autoFocus />
                        <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold">Login</button>
                    </form>
                    <p className="text-center text-zinc-500 text-xs mt-6">Password: admin123</p>
                    <a href="/" className="block text-center text-zinc-400 hover:text-white mt-4 text-sm">← Back</a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black py-6 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">EventHub Dashboard</h1>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>{liveStats.online} online</span>
                                <span className="text-zinc-500">{liveStats.checkinsToday} check-ins today</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <a href="/" className="flex items-center text-zinc-400 hover:text-white text-sm">
                            <Home className="w-4 h-4 mr-1" /> Home
                        </a>
                        <a href="/checkin" className="flex items-center text-zinc-400 hover:text-white text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" /> Check-In
                        </a>
                        <button onClick={logoutAdmin} className="flex items-center px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 text-sm">
                            Logout <LogOut className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(['overview', 'events', 'attendees', 'team', 'polls', 'festivals', 'emails', 'surveys', 'layout', 'promo', 'analytics', 'history', 'settings'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                            {tab === 'promo' ? 'Promo Codes' : tab === 'polls' ? 'Polls & Q&A' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Overview */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard icon="ticket" label="Total Tickets" value={totalTickets} color="blue" />
                            <StatCard icon="check" label="Paid" value={paidTickets} color="green" />
                            <StatCard icon="checkin" label="Checked In" value={checkedIn} color="purple" />
                            <StatCard icon="money" label="Revenue" value={`₹${(totalRevenue / 100).toLocaleString()}`} color="red" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Revenue by Event">
                                <BarChart data={salesByEvent}><CartesianGrid strokeDasharray="3 3" stroke="#333" /><XAxis dataKey="name" stroke="#888" fontSize={12} /><YAxis stroke="#888" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} /><Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} /></BarChart>
                            </ChartCard>
                            <ChartCard title="Check-in Rate">
                                <PieChart><Pie data={checkInData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"><Cell fill="#22c55e" /><Cell fill="#71717a" /></Pie><Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} /></PieChart>
                            </ChartCard>
                        </div>
                    </div>
                )}

                {/* Events */}
                {activeTab === 'events' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-white">Events ({events.length})</h2>
                            <button onClick={() => { setEditingEvent(null); setShowEventModal(true); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Create Event
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {events.map(event => {
                                const categoryStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
                                const capacityPercent = Math.round((event.soldCount / event.capacity) * 100);
                                return (
                                    <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                        <div className="h-32 relative">
                                            <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                            <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>{event.category}</span>
                                            {event.isFeatured && <span className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-600 text-white rounded-full text-xs font-bold">FEATURED</span>}
                                            {event.prizePool > 0 && <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-bold">₹{(event.prizePool / 100).toLocaleString()} Prize</span>}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-semibold text-white mb-1 truncate">{event.name}</h3>
                                            <div className="flex justify-between text-xs text-zinc-400 mb-2">
                                                <span>{new Date(event.date).toLocaleDateString()} • {event.startTime}</span>
                                                <span>₹{(event.price / 100).toLocaleString()}</span>
                                            </div>
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-zinc-500">Sold</span>
                                                    <span className={capacityPercent >= 90 ? 'text-red-400' : 'text-zinc-300'}>{event.soldCount}/{event.capacity}</span>
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
                )}

                {/* Attendees */}
                {activeTab === 'attendees' && (
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
                                <button onClick={() => {
                                    const headers = ['Ticket ID', 'Name', 'Email', 'Phone', 'Event', 'Status', 'Checked In', 'Amount Paid', 'Purchase Date'];
                                    const rows = filteredTickets.map(t => {
                                        const event = events.find(e => e.id === t.eventId);
                                        return [t.id, t.name, t.email, t.phone, event?.name || '', t.status, t.checkedIn ? 'Yes' : 'No', `₹${((event?.price || 0) / 100).toFixed(2)}`, new Date(t.createdAt).toLocaleString()];
                                    });
                                    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `attendees-${new Date().toISOString().split('T')[0]}.csv`;
                                    a.click();
                                    showToast('Attendee list exported!', 'success');
                                }} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export CSV
                                </button>
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
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
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
                )}

                {/* Team */}
                {activeTab === 'team' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Team Management</h2>
                                <p className="text-zinc-400 text-sm">Manage team roles and permissions</p>
                            </div>
                            <button
                                onClick={() => {
                                    addTeamMember({
                                        id: `team-${Date.now()}`,
                                        name: 'New Member',
                                        email: 'member@events.com',
                                        role: 'staff',
                                        eventIds: [],
                                        createdAt: new Date().toISOString(),
                                    });
                                    showToast('Team member added!', 'success');
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Add Member
                            </button>
                        </div>

                        {/* Role Legend */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                            <h3 className="text-sm font-medium text-zinc-400 mb-3">Permission Levels</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(ROLE_PERMISSIONS).map(([key, role]) => (
                                    <div key={key} className="flex items-start gap-2">
                                        <svg className={`w-5 h-5 ${role.color} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <div>
                                            <p className={`font-medium ${role.color}`}>{role.label}</p>
                                            <p className="text-xs text-zinc-500">{role.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Team Members */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teamMembers.map(member => (
                                <div key={member.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white">{member.name}</h4>
                                                <p className="text-sm text-zinc-500">{member.email}</p>
                                            </div>
                                        </div>
                                        {member.role !== 'admin' && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('Remove this team member?')) {
                                                        removeTeamMember(member.id);
                                                        showToast('Member removed', 'success');
                                                    }
                                                }}
                                                className="text-zinc-500 hover:text-red-500"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ROLE_PERMISSIONS[member.role].color} bg-zinc-800`}>
                                            {ROLE_PERMISSIONS[member.role].label}
                                        </span>
                                        <select
                                            value={member.role}
                                            onChange={(e) => {
                                                updateTeamMember(member.id, { role: e.target.value as TeamRole });
                                                showToast('Role updated!', 'success');
                                            }}
                                            disabled={member.role === 'admin'}
                                            className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 disabled:opacity-50"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="manager">Manager</option>
                                            <option value="staff">Staff</option>
                                            <option value="scanner">Scanner</option>
                                        </select>
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2">
                                        Added {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Festivals */}
                {activeTab === 'festivals' && (
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
                )}

                {/* Email Templates */}
                {activeTab === 'emails' && (
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
                        </div>

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
                )}

                {/* Surveys */}
                {activeTab === 'surveys' && (
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
                                                            onClick={() => { deleteSurvey(survey.id); showToast('Survey deleted', 'success'); }}
                                                            className="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-medium text-zinc-400">Questions ({survey.questions.length})</p>
                                                    <button
                                                        onClick={() => {
                                                            const newQuestion = { id: `q-${Date.now()}`, question: 'New question', type: 'text' as const, required: false };
                                                            updateSurvey(survey.id, { questions: [...survey.questions, newQuestion] });
                                                        }}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        + Add Question
                                                    </button>
                                                </div>
                                                {survey.questions.map((q, i) => (
                                                    <div key={q.id} className="flex items-center gap-2 group">
                                                        <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 flex-shrink-0">{i + 1}</span>
                                                        <input
                                                            type="text"
                                                            value={q.question}
                                                            onChange={(e) => {
                                                                const newQuestions = [...survey.questions];
                                                                newQuestions[i] = { ...q, question: e.target.value };
                                                                updateSurvey(survey.id, { questions: newQuestions });
                                                            }}
                                                            className="flex-1 text-sm text-zinc-300 bg-transparent border-none outline-none focus:bg-zinc-800 focus:px-2 rounded"
                                                        />
                                                        <select
                                                            value={q.type}
                                                            onChange={(e) => {
                                                                const newQuestions = [...survey.questions];
                                                                newQuestions[i] = { ...q, type: e.target.value as 'rating' | 'text' | 'multipleChoice' };
                                                                updateSurvey(survey.id, { questions: newQuestions });
                                                            }}
                                                            className="text-xs bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400"
                                                        >
                                                            <option value="rating">Rating</option>
                                                            <option value="text">Text</option>
                                                            <option value="multipleChoice">Multiple Choice</option>
                                                        </select>
                                                        <button
                                                            onClick={() => {
                                                                const newQuestions = survey.questions.filter((_, idx) => idx !== i);
                                                                updateSurvey(survey.id, { questions: newQuestions });
                                                            }}
                                                            className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Settings */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-white">Site Settings</h2>

                        {/* Hero Section Settings */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                                Home Page Hero
                            </h3>

                            <div className="space-y-4">
                                {/* Show Hero Toggle */}
                                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">Show Hero Section</p>
                                        <p className="text-sm text-zinc-500">Display the large hero banner on the home page</p>
                                    </div>
                                    <button
                                        onClick={() => updateSiteSettings({ showHero: !siteSettings.showHero })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.showHero ? 'bg-red-600' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.showHero ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {/* Hero Title */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Hero Title</label>
                                    <input
                                        type="text"
                                        value={siteSettings.heroTitle}
                                        onChange={(e) => updateSiteSettings({ heroTitle: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-red-500 focus:outline-none"
                                        placeholder="e.g. Discover Events"
                                    />
                                </div>

                                {/* Hero Subtitle */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Hero Subtitle</label>
                                    <textarea
                                        value={siteSettings.heroSubtitle}
                                        onChange={(e) => updateSiteSettings({ heroSubtitle: e.target.value })}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-red-500 focus:outline-none resize-none"
                                        placeholder="e.g. Book tickets for concerts, conferences..."
                                    />
                                </div>

                                {/* Site Name */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Site Name</label>
                                    <input
                                        type="text"
                                        value={siteSettings.siteName}
                                        onChange={(e) => updateSiteSettings({ siteName: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-red-500 focus:outline-none"
                                        placeholder="e.g. EventHub"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        {siteSettings.showHero && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-sm font-medium text-zinc-400 mb-4">Preview</h3>
                                <div className="bg-gradient-to-br from-red-900/20 via-zinc-900 to-zinc-900 rounded-xl p-8 text-center">
                                    <div className="inline-flex items-center gap-2 bg-red-900/30 text-red-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        Live Events
                                    </div>
                                    <h1 className="text-3xl font-bold text-white mb-3">{siteSettings.heroTitle}</h1>
                                    <p className="text-zinc-400 text-sm">{siteSettings.heroSubtitle}</p>
                                </div>
                            </div>
                        )}

                        {/* Ticket Design Settings */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                Custom Ticket Design
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Settings */}
                                <div className="space-y-4">
                                    {/* Logo URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Logo URL</label>
                                        <input
                                            type="text"
                                            value={siteSettings.ticketLogoUrl}
                                            onChange={(e) => updateSiteSettings({ ticketLogoUrl: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-red-500 focus:outline-none"
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>

                                    {/* Color Pickers */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Background</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={siteSettings.ticketBgColor || '#0a0a0a'}
                                                    onChange={(e) => updateSiteSettings({ ticketBgColor: e.target.value })}
                                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={siteSettings.ticketBgColor || '#0a0a0a'}
                                                    onChange={(e) => updateSiteSettings({ ticketBgColor: e.target.value })}
                                                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Text</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={siteSettings.ticketTextColor || '#ffffff'}
                                                    onChange={(e) => updateSiteSettings({ ticketTextColor: e.target.value })}
                                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={siteSettings.ticketTextColor || '#ffffff'}
                                                    onChange={(e) => updateSiteSettings({ ticketTextColor: e.target.value })}
                                                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Accent</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={siteSettings.ticketAccentColor || '#dc2626'}
                                                    onChange={(e) => updateSiteSettings({ ticketAccentColor: e.target.value })}
                                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    onChange={(e) => updateSiteSettings({ ticketAccentColor: e.target.value })}
                                                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Border Color */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Border Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={siteSettings.ticketBorderColor || '#333333'}
                                                onChange={(e) => updateSiteSettings({ ticketBorderColor: e.target.value })}
                                                className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={siteSettings.ticketBorderColor || '#333333'}
                                                onChange={(e) => updateSiteSettings({ ticketBorderColor: e.target.value })}
                                                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Border Style */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Border Style</label>
                                        <div className="flex gap-2">
                                            {(['solid', 'dashed', 'none'] as const).map(style => (
                                                <button
                                                    key={style}
                                                    onClick={() => updateSiteSettings({ ticketBorderStyle: style })}
                                                    className={`px-4 py-2 rounded-xl text-sm capitalize ${siteSettings.ticketBorderStyle === style ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Show QR Code */}
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                        <div>
                                            <p className="font-medium text-white">Show QR Code</p>
                                            <p className="text-sm text-zinc-500">Display QR code on ticket for check-in</p>
                                        </div>
                                        <button
                                            onClick={() => updateSiteSettings({ ticketShowQrCode: !siteSettings.ticketShowQrCode })}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.ticketShowQrCode ? 'bg-red-600' : 'bg-zinc-700'}`}
                                        >
                                            <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.ticketShowQrCode ? 'left-6' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    {/* Font Family */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Font Style</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['inter', 'roboto', 'playfair', 'montserrat'] as const).map(font => (
                                                <button
                                                    key={font}
                                                    onClick={() => updateSiteSettings({ ticketFontFamily: font })}
                                                    className={`px-3 py-2 rounded-lg text-sm capitalize ${(siteSettings.ticketFontFamily || 'inter') === font ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                                    style={{ fontFamily: font === 'playfair' ? 'Georgia, serif' : font }}
                                                >
                                                    {font}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Border Radius */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                                            Border Radius: {siteSettings.ticketBorderRadius || 16}px
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="32"
                                            value={siteSettings.ticketBorderRadius || 16}
                                            onChange={(e) => updateSiteSettings({ ticketBorderRadius: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                                        />
                                    </div>

                                    {/* Gradient Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                        <div>
                                            <p className="font-medium text-white">Gradient Background</p>
                                            <p className="text-sm text-zinc-500">Add gradient effect to ticket</p>
                                        </div>
                                        <button
                                            onClick={() => updateSiteSettings({ ticketGradient: !siteSettings.ticketGradient })}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.ticketGradient ? 'bg-red-600' : 'bg-zinc-700'}`}
                                        >
                                            <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.ticketGradient ? 'left-6' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    {siteSettings.ticketGradient && (
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">Gradient End Color</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={siteSettings.ticketGradientColor || '#1a1a1a'}
                                                    onChange={(e) => updateSiteSettings({ ticketGradientColor: e.target.value })}
                                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={siteSettings.ticketGradientColor || '#1a1a1a'}
                                                    onChange={(e) => updateSiteSettings({ ticketGradientColor: e.target.value })}
                                                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Pattern */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Background Pattern</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['none', 'dots', 'lines', 'grid'] as const).map(pattern => (
                                                <button
                                                    key={pattern}
                                                    onClick={() => updateSiteSettings({ ticketPatternType: pattern, ticketShowPattern: pattern !== 'none' })}
                                                    className={`px-3 py-2 rounded-lg text-sm capitalize ${(siteSettings.ticketPatternType || 'none') === pattern ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                                >
                                                    {pattern}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Preview */}
                                <div>
                                    <p className="text-sm font-medium text-zinc-400 mb-3">Ticket Preview</p>
                                    <div
                                        className="overflow-hidden relative"
                                        style={{
                                            borderRadius: `${siteSettings.ticketBorderRadius || 16}px`,
                                            background: siteSettings.ticketGradient
                                                ? `linear-gradient(135deg, ${siteSettings.ticketBgColor || '#0a0a0a'}, ${siteSettings.ticketGradientColor || '#1a1a1a'})`
                                                : siteSettings.ticketBgColor || '#0a0a0a',
                                            border: (siteSettings.ticketBorderStyle || 'solid') === 'none' ? 'none' : `2px ${siteSettings.ticketBorderStyle || 'solid'} ${siteSettings.ticketAccentColor || '#dc2626'}`,
                                            fontFamily: siteSettings.ticketFontFamily === 'playfair' ? 'Georgia, serif' : (siteSettings.ticketFontFamily || 'Inter, sans-serif')
                                        }}
                                    >
                                        {/* Pattern Overlay */}
                                        {siteSettings.ticketShowPattern && siteSettings.ticketPatternType !== 'none' && (
                                            <div className="absolute inset-0 opacity-10" style={{
                                                backgroundImage: siteSettings.ticketPatternType === 'dots'
                                                    ? `radial-gradient(circle, ${siteSettings.ticketAccentColor || '#dc2626'} 1px, transparent 1px)`
                                                    : siteSettings.ticketPatternType === 'lines'
                                                        ? `repeating-linear-gradient(45deg, transparent, transparent 10px, ${siteSettings.ticketAccentColor || '#dc2626'} 10px, ${siteSettings.ticketAccentColor || '#dc2626'} 11px)`
                                                        : `linear-gradient(to right, ${siteSettings.ticketAccentColor || '#dc2626'} 1px, transparent 1px), linear-gradient(to bottom, ${siteSettings.ticketAccentColor || '#dc2626'} 1px, transparent 1px)`,
                                                backgroundSize: siteSettings.ticketPatternType === 'dots' ? '12px 12px' : siteSettings.ticketPatternType === 'grid' ? '20px 20px' : 'auto'
                                            }} />
                                        )}
                                        <div className="p-6 relative">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    {siteSettings.ticketLogoUrl && (
                                                        <img src={siteSettings.ticketLogoUrl} alt="Logo" className="h-8 mb-2" />
                                                    )}
                                                    <p className="text-xs opacity-60" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>ADMIT ONE</p>
                                                    <h3 className="text-xl font-bold" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>
                                                        Summer Music Festival
                                                    </h3>
                                                    <p className="text-sm mt-1" style={{ color: siteSettings.ticketAccentColor || '#dc2626' }}>
                                                        VIP Access
                                                    </p>
                                                </div>
                                                {siteSettings.ticketShowQrCode && (
                                                    <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg">
                                                        <svg className="w-16 h-16 text-black" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm8-1h7v7h-7V3zm1 1v5h5V4h-5zM3 12h7v7H3v-7zm1 1v5h5v-5H4zm11 1h1v1h-1v-1zm-3-1h1v1h-1v-1zm5 0h1v1h-1v-1zm-2 2h1v1h-1v-1zm2 0h3v3h-3v-3zm1 1v1h1v-1h-1zm-8 3h1v1h-1v-1zm2 0h1v1h-1v-1zm4 0h1v1h-1v-1z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="opacity-50 text-xs" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>DATE</p>
                                                    <p className="font-semibold" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>Dec 25, 2024</p>
                                                </div>
                                                <div>
                                                    <p className="opacity-50 text-xs" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>TIME</p>
                                                    <p className="font-semibold" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>7:00 PM</p>
                                                </div>
                                                <div>
                                                    <p className="opacity-50 text-xs" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>VENUE</p>
                                                    <p className="font-semibold" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>City Arena</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className="px-6 py-3 border-t relative"
                                            style={{ borderColor: (siteSettings.ticketAccentColor || '#dc2626') + '40' }}
                                        >
                                            <div className="flex justify-between items-center text-sm">
                                                <div>
                                                    <span className="font-mono text-xs opacity-60" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>
                                                        #TKT-2024-123456
                                                    </span>
                                                    <p className="text-xs mt-0.5" style={{ color: siteSettings.ticketTextColor || '#ffffff', opacity: 0.5 }}>
                                                        John Doe • john@example.com
                                                    </p>
                                                </div>
                                                <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: siteSettings.ticketAccentColor || '#dc2626', color: '#fff' }}>
                                                    ✓ VALID
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Registration Fields */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
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

                        {/* SMS/WhatsApp Reminders */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Event Reminders
                            </h3>
                            <p className="text-zinc-500 text-sm mb-4">Send automated reminders to attendees before events</p>

                            <div className="space-y-4">
                                {/* SMS Toggle */}
                                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">SMS Reminders</p>
                                            <p className="text-sm text-zinc-500">Send text message reminders via Twilio</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSiteSettings({ smsReminders: !siteSettings.smsReminders })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.smsReminders ? 'bg-blue-600' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.smsReminders ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {/* WhatsApp Toggle */}
                                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">WhatsApp Reminders</p>
                                            <p className="text-sm text-zinc-500">Send WhatsApp messages to attendees</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSiteSettings({ whatsappReminders: !siteSettings.whatsappReminders })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.whatsappReminders ? 'bg-green-600' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.whatsappReminders ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {/* Reminder Time */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        Send reminder {siteSettings.reminderHoursBefore || 24} hours before event
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="72"
                                        value={siteSettings.reminderHoursBefore || 24}
                                        onChange={(e) => updateSiteSettings({ reminderHoursBefore: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                                    />
                                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                                        <span>1 hour</span>
                                        <span>24 hours</span>
                                        <span>72 hours</span>
                                    </div>
                                </div>

                                {(siteSettings.smsReminders || siteSettings.whatsappReminders) && (
                                    <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-xl">
                                        <p className="text-sm text-yellow-400 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            API configuration required. Set up Twilio/WhatsApp API keys in environment variables.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Layout Tab */}
                {activeTab === 'layout' && (
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

                        {/* Home Page Sections */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Home Page Sections
                            </h3>
                            <div className="grid gap-4">
                                {/* Events Grid Toggle */}
                                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">Events Grid</p>
                                        <p className="text-sm text-zinc-500">Show the grid of events on home page</p>
                                    </div>
                                    <button
                                        onClick={() => updateSiteSettings({ showEventsGrid: !siteSettings.showEventsGrid })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.showEventsGrid ? 'bg-red-600' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.showEventsGrid ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {/* Ticket Form Toggle */}
                                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">Ticket Purchase Form</p>
                                        <p className="text-sm text-zinc-500">Show ticket purchase section on home page</p>
                                    </div>
                                    <button
                                        onClick={() => updateSiteSettings({ showTicketForm: !siteSettings.showTicketForm })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.showTicketForm ? 'bg-red-600' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.showTicketForm ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {/* Categories Toggle */}
                                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">Category Filters</p>
                                        <p className="text-sm text-zinc-500">Show category filter buttons</p>
                                    </div>
                                    <button
                                        onClick={() => updateSiteSettings({ showCategories: !siteSettings.showCategories })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${siteSettings.showCategories ? 'bg-red-600' : 'bg-zinc-700'}`}
                                    >
                                        <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${siteSettings.showCategories ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {/* Grid Columns */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Events Grid Columns</label>
                                    <div className="flex gap-2">
                                        {([2, 3, 4] as const).map(cols => (
                                            <button
                                                key={cols}
                                                onClick={() => updateSiteSettings({ eventsGridColumns: cols })}
                                                className={`flex-1 px-4 py-2 rounded-xl text-sm ${siteSettings.eventsGridColumns === cols ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                            >
                                                {cols} Columns
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

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
                                            <label className="block text-sm font-medium text-zinc-400 mb-1">Message</label>
                                            <input
                                                type="text"
                                                value={siteSettings.announcement?.message || ''}
                                                onChange={(e) => updateSiteSettings({ announcement: { ...siteSettings.announcement!, message: e.target.value } })}
                                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
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
                                                    {siteSettings.announcement?.message}
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
                    </div>
                )}

                {/* Promo Codes Tab */}
                {activeTab === 'promo' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
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
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
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
                )}

                {/* Polls Tab */}
                {activeTab === 'polls' && (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                        <AdminPollManager events={events.map(e => ({ id: e.id, name: e.name }))} />
                    </div>
                )}

                {activeTab === 'analytics' && (
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
                                <p className="text-3xl font-bold text-white">{events.reduce((sum, e) => sum + e.soldCount, 0)}</p>
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
                                <p className="text-3xl font-bold text-white">₹{Math.round(events.reduce((s, e) => s + e.price, 0) / events.length / 100).toLocaleString()}</p>
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
                                <p className="text-3xl font-bold text-white">{Math.round((events.reduce((s, e) => s + e.soldCount, 0) / events.reduce((s, e) => s + e.capacity, 0)) * 100)}%</p>
                                <p className="text-orange-400 text-sm mt-1">Capacity utilization</p>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Revenue by Event */}
                            <ChartCard title="Revenue by Event">
                                <BarChart data={events.slice(0, 5).map(e => ({ name: e.name.slice(0, 15) + '...', revenue: Math.round((e.soldCount * e.price) / 100) }))}>
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
                                            value: events.filter(e => e.category === cat).reduce((s, e) => s + e.soldCount, 0)
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
                                        {events.map(event => (
                                            <tr key={event.id} className="hover:bg-zinc-800/30">
                                                <td className="px-4 py-3 text-sm text-white">{event.name}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-300">₹{(event.price / 100).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-300">{event.soldCount}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-300">{event.capacity}</td>
                                                <td className="px-4 py-3 text-sm text-green-400 font-medium">₹{((event.soldCount * event.price) / 100).toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${(event.soldCount / event.capacity) >= 0.9 ? 'bg-red-500' : (event.soldCount / event.capacity) >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                                style={{ width: `${Math.min((event.soldCount / event.capacity) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-zinc-400">{Math.round((event.soldCount / event.capacity) * 100)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Sales by Event</h3>
                            <div className="h-80">
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
                            <div className="h-80">
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
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
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
                                            .sort((a, b) => new Date(b.checkedInAt || b.updatedAt).getTime() - new Date(a.checkedInAt || a.updatedAt).getTime())
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
                                                        {new Date(ticket.checkedInAt || ticket.updatedAt).toLocaleString()}
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
                )}

                {showEventModal && <EventModal event={editingEvent} onSave={handleSaveEvent} onClose={() => { setShowEventModal(false); setEditingEvent(null); }} />}
            </div>
        </main>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
    const colors = { blue: 'bg-blue-900/50 text-blue-400', green: 'bg-green-900/50 text-green-400', purple: 'bg-purple-900/50 text-purple-400', red: 'bg-red-900/50 text-red-400' };
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icon === 'ticket' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />}
                        {icon === 'check' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                        {icon === 'checkin' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
                        {icon === 'money' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                </div>
                <span className="text-zinc-400 text-sm">{label}</span>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
        </div>
    );
}

function EventModal({ event, onSave, onClose }: { event: Event | null; onSave: (data: Partial<Event>) => void; onClose: () => void }) {
    const [tab, setTab] = useState<'basic' | 'details' | 'pricing' | 'schedule' | 'sponsors' | 'media'>('basic');
    const [formData, setFormData] = useState({
        name: event?.name || '',
        description: event?.description || '',
        date: event?.date || '',
        startTime: event?.startTime || '09:00',
        endTime: event?.endTime || '18:00',
        venue: event?.venue || '',
        address: event?.address || '',
        price: event ? event.price / 100 : 0,
        entryFee: event ? event.entryFee / 100 : 0,
        prizePool: event ? event.prizePool / 100 : 0,
        category: event?.category || 'other',
        imageUrl: event?.imageUrl || '',
        capacity: event?.capacity || 100,
        isFeatured: event?.isFeatured || false,
        organizer: event?.organizer || '',
        contactEmail: event?.contactEmail || '',
        contactPhone: event?.contactPhone || '',
        termsAndConditions: event?.termsAndConditions || '',
        registrationDeadline: event?.registrationDeadline || '',
        tags: event?.tags?.join(', ') || '',
        schedule: event?.schedule || [],
        // Early Bird Pricing
        earlyBirdEnabled: event?.earlyBirdEnabled || false,
        earlyBirdPrice: event ? (event.earlyBirdPrice || 0) / 100 : 0,
        earlyBirdDeadline: event?.earlyBirdDeadline || '',
        // Event Reminders
        sendReminders: event?.sendReminders ?? true,
        sponsors: event?.sponsors || [],
    });

    const addScheduleItem = () => {
        setFormData({
            ...formData,
            schedule: [...formData.schedule, { id: `s${Date.now()}`, time: '', title: '', description: '', speaker: '' }]
        });
    };

    const updateScheduleItem = (index: number, field: string, value: string) => {
        const newSchedule = [...formData.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setFormData({ ...formData, schedule: newSchedule });
    };

    const removeScheduleItem = (index: number) => {
        setFormData({ ...formData, schedule: formData.schedule.filter((_, i) => i !== index) });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            price: formData.price * 100,
            entryFee: formData.entryFee * 100,
            prizePool: formData.prizePool * 100,
            earlyBirdPrice: formData.earlyBirdPrice * 100,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">{event ? 'Edit Event' : 'Create Event'}</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 px-6 overflow-x-auto">
                    {(['basic', 'details', 'pricing', 'schedule', 'sponsors', 'media'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-400 hover:text-white'}`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {tab === 'basic' && (
                        <>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Event Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" rows={3} /></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Date *</label><input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Start Time</label><input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">End Time</label><input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as Event['category'] })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"><option value="music">Music</option><option value="tech">Tech</option><option value="art">Art</option><option value="sports">Sports</option><option value="food">Food</option><option value="gaming">Gaming</option><option value="business">Business</option><option value="other">Other</option></select></div>
                            <div className="flex items-center gap-2"><input type="checkbox" id="featured" checked={formData.isFeatured} onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })} className="w-4 h-4 rounded" /><label htmlFor="featured" className="text-sm text-zinc-300">Featured Event</label></div>
                        </>
                    )}

                    {tab === 'details' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Venue *</label><input type="text" required value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Full Address</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Ticket Price (₹)</label><input type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Entry Fee (₹)</label><input type="number" min="0" value={formData.entryFee} onChange={(e) => setFormData({ ...formData, entryFee: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Prize Pool (₹)</label><input type="number" min="0" value={formData.prizePool} onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Capacity</label><input type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Registration Deadline</label><input type="date" value={formData.registrationDeadline} onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Tags (comma separated)</label><input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="gaming, esports, tournament" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Organizer</label><input type="text" value={formData.organizer} onChange={(e) => setFormData({ ...formData, organizer: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                                <div><label className="block text-sm font-medium text-zinc-300 mb-1">Contact Email</label><input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Terms & Conditions</label><textarea value={formData.termsAndConditions} onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" rows={2} /></div>
                        </>
                    )}

                    {tab === 'pricing' && (
                        <>
                            {/* Early Bird Pricing Section */}
                            <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Early Bird Pricing
                                        </h3>
                                        <p className="text-zinc-400 text-sm">Offer discounted tickets before a deadline</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.earlyBirdEnabled}
                                            onChange={(e) => setFormData({ ...formData, earlyBirdEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {formData.earlyBirdEnabled && (
                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-700">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-1">Early Bird Price (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.earlyBirdPrice}
                                                onChange={(e) => setFormData({ ...formData, earlyBirdPrice: Number(e.target.value) })}
                                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white"
                                                placeholder="Discounted price"
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {formData.price > 0 && formData.earlyBirdPrice > 0 && (
                                                    <>Save {Math.round(((formData.price - formData.earlyBirdPrice) / formData.price) * 100)}% off regular price</>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-1">Early Bird Deadline</label>
                                            <input
                                                type="date"
                                                value={formData.earlyBirdDeadline}
                                                onChange={(e) => setFormData({ ...formData, earlyBirdDeadline: e.target.value })}
                                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white"
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">Price increases after this date</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Event Reminders Section */}
                            <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            Event Reminders
                                        </h3>
                                        <p className="text-zinc-400 text-sm">Send email reminders to ticket holders before the event</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.sendReminders}
                                            onChange={(e) => setFormData({ ...formData, sendReminders: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>
                                {formData.sendReminders && (
                                    <div className="mt-4 pt-4 border-t border-zinc-700">
                                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Attendees will receive reminders:
                                        </p>
                                        <ul className="text-sm text-zinc-500 mt-2 space-y-1">
                                            <li>• 7 days before the event</li>
                                            <li>• 1 day before the event</li>
                                            <li>• 2 hours before the event</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Pricing Summary */}
                            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-5 border border-red-800/50">
                                <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Pricing Summary
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Regular Price</span>
                                        <span className="text-white font-semibold">₹{formData.price.toLocaleString()}</span>
                                    </div>
                                    {formData.earlyBirdEnabled && (
                                        <div className="flex justify-between">
                                            <span className="text-zinc-400">Early Bird Price</span>
                                            <span className="text-green-400 font-semibold">₹{formData.earlyBirdPrice.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'schedule' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-white">Event Schedule</h3>
                                <button type="button" onClick={addScheduleItem} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">+ Add Item</button>
                            </div>
                            {formData.schedule.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No schedule items yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {formData.schedule.map((item, index) => (
                                        <div key={item.id} className="bg-zinc-800 rounded-xl p-4 space-y-2">
                                            <div className="flex gap-2">
                                                <input type="time" value={item.time} onChange={(e) => updateScheduleItem(index, 'time', e.target.value)} className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" />
                                                <input type="text" value={item.title} onChange={(e) => updateScheduleItem(index, 'title', e.target.value)} className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" placeholder="Session title" />
                                                <button type="button" onClick={() => removeScheduleItem(index)} className="px-2 text-red-400 hover:text-red-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                            <input type="text" value={item.description} onChange={(e) => updateScheduleItem(index, 'description', e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" placeholder="Description" />
                                            <input type="text" value={item.speaker || ''} onChange={(e) => updateScheduleItem(index, 'speaker', e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm" placeholder="Speaker (optional)" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}



                    {tab === 'sponsors' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-white">Event Sponsors</h3>
                                <button
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        sponsors: [...formData.sponsors, { id: `sp-${Date.now()}`, name: '', logoUrl: '', tier: 'gold' }]
                                    })}
                                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                                >
                                    + Add Sponsor
                                </button>
                            </div>
                            {formData.sponsors.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No sponsors added yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {formData.sponsors.map((sponsor, index) => (
                                        <div key={sponsor.id} className="bg-zinc-800 rounded-xl p-4 space-y-3">
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-xs text-zinc-400">Name</label>
                                                    <input
                                                        type="text"
                                                        value={sponsor.name}
                                                        onChange={(e) => {
                                                            const newSponsors = [...formData.sponsors];
                                                            newSponsors[index] = { ...sponsor, name: e.target.value };
                                                            setFormData({ ...formData, sponsors: newSponsors });
                                                        }}
                                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                                                        placeholder="Sponsor Name"
                                                    />
                                                </div>
                                                <div className="w-32 space-y-2">
                                                    <label className="text-xs text-zinc-400">Tier</label>
                                                    <select
                                                        value={sponsor.tier}
                                                        onChange={(e) => {
                                                            const newSponsors = [...formData.sponsors];
                                                            newSponsors[index] = { ...sponsor, tier: e.target.value as 'gold' | 'silver' | 'bronze' };
                                                            setFormData({ ...formData, sponsors: newSponsors });
                                                        }}
                                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                                                    >
                                                        <option value="gold">Gold</option>
                                                        <option value="silver">Silver</option>
                                                        <option value="bronze">Bronze</option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSponsors = formData.sponsors.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, sponsors: newSponsors });
                                                    }}
                                                    className="mt-6 text-zinc-500 hover:text-red-400"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-zinc-400">Logo URL</label>
                                                <input
                                                    type="text"
                                                    value={sponsor.logoUrl}
                                                    onChange={(e) => {
                                                        const newSponsors = [...formData.sponsors];
                                                        newSponsors[index] = { ...sponsor, logoUrl: e.target.value };
                                                        setFormData({ ...formData, sponsors: newSponsors });
                                                    }}
                                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
                                                    placeholder="https://example.com/logo.png"
                                                />
                                            </div>
                                            {sponsor.logoUrl && (
                                                <div className="p-2 bg-white/5 rounded-lg inline-block">
                                                    <img src={sponsor.logoUrl} alt="Logo preview" className="h-8 object-contain" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'media' && (
                        <>
                            <div><label className="block text-sm font-medium text-zinc-300 mb-1">Event Image URL</label><input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" placeholder="https://..." /></div>
                            {formData.imageUrl && (
                                <div className="mt-2">
                                    <p className="text-sm text-zinc-400 mb-2">Preview:</p>
                                    <img src={formData.imageUrl} alt="Preview" className="h-32 rounded-lg object-cover" />
                                </div>
                            )}
                            <div className="text-center text-zinc-500 text-sm py-2">— or upload an image —</div>
                            <div className="bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-red-500/50 transition-colors relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            if (file.size > 5 * 1024 * 1024) {
                                                alert('File size must be less than 5MB');
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const base64 = event.target?.result as string;
                                                setFormData({ ...formData, imageUrl: base64 });
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-zinc-400 text-sm">Click or drag to upload image</p>
                                <p className="text-zinc-500 text-xs mt-1">PNG, JPG, WebP up to 5MB</p>
                            </div>
                        </>
                    )}
                </form>

                <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700">Cancel</button>
                    <button onClick={handleSubmit} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium">{event ? 'Save Changes' : 'Create Event'}</button>
                </div>
            </div>
        </div >
    );
}
