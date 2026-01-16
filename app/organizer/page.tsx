'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, BarChart3, LogOut, Search } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface Event {
    id: string;
    name: string;
    date: string;
    venue: string;
    price: number;
    soldCount: number;
    capacity: number;
    imageUrl?: string;
}

interface User {
    name: string;
    role: string;
    assignedEventIds: string[];
}

export default function OrganizerDashboard() {
    const router = useRouter();
    const { showToast } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            // We can reuse the admin/pricing-check or create a dedicated me endpoint later. 
            // For now, let's just assume if we hit the page we are auth'd by middleware 
            // but we need user details.
            // Let's use the login API user response if stored or fetch profile.
            // Since we don't have a specific /api/me, let's fetch events and infer.
            // Actually, we need to show ONLY assigned events.
            // The /api/events endpoint returns all events. 
            // We should filter them client side if the API doesn't support it, 
            // OR update API to filter based on user role.
            // For now, let's fetch all and filter client side if we can get user info.
            // Wait, we don't have an easy way to get current user info on client side 
            // if we don't store it in context/localStorage.
            // Let's fetch from a new endpoint /api/user/me or similar.
            // I'll quickly Create /api/auth/me to get session info.

            const meRes = await fetch('/api/auth/me'); // We need to create this
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

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/20">
                            OD
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                                Organizer Dashboard
                            </h1>
                            <p className="text-xs text-zinc-500">Welcome, {user?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-sm font-medium hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Calendar className="w-24 h-24 text-purple-500" />
                        </div>
                        <p className="text-zinc-500 text-sm font-medium mb-1">Assigned Events</p>
                        <h3 className="text-3xl font-bold text-white mb-2">{events.length}</h3>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 w-2/3"></div>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="w-24 h-24 text-blue-500" />
                        </div>
                        <p className="text-zinc-500 text-sm font-medium mb-1">Total Attendees</p>
                        <h3 className="text-3xl font-bold text-white mb-2">
                            {events.reduce((acc, curr) => acc + curr.soldCount, 0)}
                        </h3>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-1/2"></div>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BarChart3 className="w-24 h-24 text-green-500" />
                        </div>
                        <p className="text-zinc-500 text-sm font-medium mb-1">Total Revenue</p>
                        <h3 className="text-3xl font-bold text-white mb-2">
                            ₹{(events.reduce((acc, curr) => acc + (curr.price * curr.soldCount), 0) / 100).toLocaleString()}
                        </h3>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-3/4"></div>
                        </div>
                    </div>
                </div>

                {/* Events Grid */}
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-purple-500" /> Your Events
                </h2>

                {events.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/5">
                        <p className="text-zinc-500">No events assigned to you yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(event => (
                            <div key={event.id} className="glass-card rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all group">
                                <div className="h-40 bg-zinc-800 relative">
                                    {event.imageUrl ? (
                                        <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white border border-white/10">
                                        {new Date(event.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">{event.name}</h3>
                                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{event.venue}</p>

                                    <div className="flex items-center justify-between text-sm text-zinc-500 mb-6">
                                        <span>Capacity: {event.capacity}</span>
                                        <span>Sold: <span className="text-white font-medium">{event.soldCount}</span></span>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => router.push(`/checkin?event=${event.id}`)}
                                            className="flex-1 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors"
                                        >
                                            Check-in
                                        </button>
                                        <button
                                            onClick={() => router.push(`/event/${event.id}`)}
                                            className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
