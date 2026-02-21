'use client';

import { useState, useMemo } from 'react';
import { useApp, CATEGORY_COLORS } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Search, Calendar, MapPin, Users, Ticket, SlidersHorizontal, X, ArrowRight, Clock, Zap, TrendingUp, Star } from 'lucide-react';
import Link from 'next/link';

const CATEGORY_ICONS: Record<string, string> = {
    all: '✦', music: '🎵', tech: '💻', art: '🎨',
    sports: '⚽', food: '🍽️', gaming: '🎮', business: '💼', other: '🎟️',
};

const SORT_OPTIONS = [
    { value: 'date-asc', label: 'Date: Soonest first' },
    { value: 'date-desc', label: 'Date: Latest first' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'spots', label: 'Spots Available' },
];

export default function DiscoverPage() {
    const { events, siteSettings } = useApp();
    const router = useRouter();

    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('date-asc');
    const [showFree, setShowFree] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const categories = ['all', ...(siteSettings.enabledCategories?.filter(c => c !== 'all') || ['music', 'tech', 'art', 'sports', 'food', 'gaming', 'business'])];

    const activeEvents = events.filter(e => e.isActive);

    // Filtered + sorted events
    const filtered = useMemo(() => {
        let list = activeEvents.filter(e => {
            const matchQuery = !query || e.name.toLowerCase().includes(query.toLowerCase()) || e.venue?.toLowerCase().includes(query.toLowerCase()) || e.description?.toLowerCase().includes(query.toLowerCase());
            const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
            const matchFree = !showFree || e.price === 0;
            return matchQuery && matchCat && matchFree;
        });

        switch (sortBy) {
            case 'date-asc': list = list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
            case 'date-desc': list = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); break;
            case 'price-asc': list = list.sort((a, b) => a.price - b.price); break;
            case 'price-desc': list = list.sort((a, b) => b.price - a.price); break;
            case 'popular': list = list.sort((a, b) => b.soldCount - a.soldCount); break;
            case 'spots': list = list.sort((a, b) => (a.capacity - a.soldCount) - (b.capacity - b.soldCount)); break;
        }
        return list;
    }, [activeEvents, query, selectedCategory, sortBy, showFree]);

    // Spotlight picks
    const featuredEvents = activeEvents.filter(e => e.isFeatured).slice(0, 3);
    const trendingEvents = [...activeEvents].sort((a, b) => b.soldCount - a.soldCount).slice(0, 4);
    const freeEvents = activeEvents.filter(e => e.price === 0).slice(0, 4);
    const upcomingToday = activeEvents.filter(e => {
        const d = new Date(e.date);
        const t = new Date();
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    });

    return (
        <main className="min-h-screen bg-[#0B0B0B] text-white pb-24">
            {/* Hero Search Bar */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-red-950/30 via-zinc-950/80 to-[#0B0B0B]" />
                <div className="absolute top-0 left-1/3 w-96 h-96 bg-red-600/10 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-10">
                    <p className="text-red-400 text-sm font-semibold uppercase tracking-widest mb-3 text-center">Discover Events</p>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-2 leading-tight">
                        Find your next<br /><span className="text-red-500">unforgettable</span> experience
                    </h1>
                    <p className="text-zinc-400 text-center mb-8 text-lg">{activeEvents.length} events happening near you</p>

                    {/* Search input */}
                    <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search events, venues, or keywords…"
                            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/40 text-base backdrop-blur"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                {/* Category chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all shrink-0
                                ${selectedCategory === cat
                                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20'
                                    : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'}`}
                        >
                            <span>{CATEGORY_ICONS[cat]}</span>
                            <span className="capitalize">{cat}</span>
                        </button>
                    ))}
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between gap-3 mb-8">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${showFilters ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:text-white'}`}
                        >
                            <SlidersHorizontal className="w-4 h-4" /> Filters
                        </button>
                        {showFree && (
                            <span className="flex items-center gap-1 px-3 py-1 bg-green-600/20 border border-green-500/30 text-green-400 text-xs rounded-full">
                                Free only <button onClick={() => setShowFree(false)}><X className="w-3 h-3 ml-1" /></button>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700/50 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-500/50"
                        >
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <div className="flex rounded-xl overflow-hidden border border-zinc-700/50">
                            {(['grid', 'list'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    className={`px-3 py-2 text-xs font-medium transition-all ${viewMode === m ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                                >
                                    {m === 'grid' ? '⊞' : '☰'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="mb-6 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                            <input type="checkbox" checked={showFree} onChange={e => setShowFree(e.target.checked)} className="accent-red-500 w-4 h-4" />
                            Free events only
                        </label>
                    </div>
                )}

                {/* Today banner */}
                {upcomingToday.length > 0 && (
                    <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                        <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                        <span className="text-amber-300 text-sm font-medium">{upcomingToday.length} event{upcomingToday.length > 1 ? 's' : ''} happening today!</span>
                        <div className="flex gap-2 ml-auto">
                            {upcomingToday.map(e => (
                                <button key={e.id} onClick={() => router.push(`/event/${e.id}`)} className="text-xs bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full hover:bg-amber-500/30 transition">
                                    {e.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Featured spotlight (only when no search/filter active) */}
                {!query && selectedCategory === 'all' && featuredEvents.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <h2 className="text-base font-semibold text-zinc-200">Featured</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {featuredEvents.map(event => (
                                <EventCard key={event.id} event={event} featured />
                            ))}
                        </div>
                    </section>
                )}

                {/* Trending (only when no search/filter active) */}
                {!query && selectedCategory === 'all' && trendingEvents.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-red-400" />
                            <h2 className="text-base font-semibold text-zinc-200">Trending Now</h2>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {trendingEvents.map((event, i) => (
                                <div
                                    key={event.id}
                                    onClick={() => router.push(`/event/${event.id}`)}
                                    className="shrink-0 w-56 bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:border-zinc-600 transition-all hover:-translate-y-1 group"
                                >
                                    <div className="relative h-32">
                                        {event.imageUrl
                                            ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl">{CATEGORY_ICONS[event.category]}</div>
                                        }
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">#{i + 1}</div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-white text-sm font-semibold line-clamp-1 group-hover:text-red-400 transition">{event.name}</p>
                                        <p className="text-zinc-500 text-xs mt-1">{event.soldCount} registered</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Free events row */}
                {!query && selectedCategory === 'all' && freeEvents.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-base">🆓</span>
                                <h2 className="text-base font-semibold text-zinc-200">Free to Attend</h2>
                            </div>
                            <button onClick={() => setShowFree(true)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                See all <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {freeEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => router.push(`/event/${event.id}`)}
                                    className="shrink-0 w-56 bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:border-green-500/30 transition-all hover:-translate-y-1 group"
                                >
                                    <div className="relative h-32">
                                        {event.imageUrl
                                            ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl">{CATEGORY_ICONS[event.category]}</div>
                                        }
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                                        <div className="absolute top-2 right-2 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">FREE</div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-white text-sm font-semibold line-clamp-1 group-hover:text-green-400 transition">{event.name}</p>
                                        <p className="text-zinc-500 text-xs mt-1">{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Main results grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-zinc-200">
                            {query || selectedCategory !== 'all' || showFree
                                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
                                : 'All Events'}
                        </h2>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-5xl mb-4">🔍</div>
                            <h3 className="text-xl font-bold text-white mb-2">No events found</h3>
                            <p className="text-zinc-400 mb-6">Try adjusting your search or filters.</p>
                            <button onClick={() => { setQuery(''); setSelectedCategory('all'); setShowFree(false); }} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white text-sm font-medium transition">
                                Clear filters
                            </button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map(event => <EventCard key={event.id} event={event} />)}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filtered.map(event => <EventListRow key={event.id} event={event} />)}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function EventCard({ event, featured = false }: { event: any; featured?: boolean }) {
    const router = useRouter();
    const capacityPct = Math.min(Math.round((event.soldCount / event.capacity) * 100), 100);
    const isSoldOut = event.soldCount >= event.capacity;
    const spotsLeft = event.capacity - event.soldCount;
    const isLow = spotsLeft <= 10 && spotsLeft > 0;

    return (
        <div
            onClick={() => router.push(`/event/${event.id}`)}
            className={`group cursor-pointer bg-zinc-900/60 border rounded-2xl overflow-hidden transition-all hover:-translate-y-1.5 hover:shadow-xl
                ${featured ? 'border-yellow-500/25 hover:border-yellow-400/40 hover:shadow-yellow-900/20' : 'border-zinc-800 hover:border-zinc-600 hover:shadow-black/40'}`}
        >
            {/* Image */}
            <div className="relative h-44">
                {event.imageUrl
                    ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-4xl">{CATEGORY_ICONS[event.category]}</div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                <div className="absolute top-3 right-3 flex gap-1.5">
                    {featured && <span className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs px-2 py-0.5 rounded-full font-semibold">⭐ Featured</span>}
                    {event.price === 0 && <span className="bg-green-500/20 border border-green-500/40 text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">FREE</span>}
                    {isSoldOut && <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-xs px-2 py-0.5 rounded-full font-semibold">SOLD OUT</span>}
                    {!isSoldOut && isLow && <span className="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse">{spotsLeft} left!</span>}
                </div>
                <div className="absolute bottom-3 left-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[event.category] || 'bg-zinc-700 text-zinc-300'}`}>{event.category}</span>
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                <h3 className="text-white font-bold text-base line-clamp-1 group-hover:text-red-400 transition mb-2">{event.name}</h3>
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {event.startTime && <><Clock className="w-3 h-3 ml-1" />{event.startTime}</>}
                </div>
                {event.venue && (
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-3">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">{event.venue}</span>
                    </div>
                )}

                {/* Capacity bar */}
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.soldCount} registered</span>
                        <span>{capacityPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${capacityPct}%`, background: isSoldOut ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e' }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-base">{event.price === 0 ? 'FREE' : `₹${event.price.toLocaleString('en-IN')}`}</span>
                    <span className="text-red-400 text-xs flex items-center gap-1 group-hover:gap-2 transition-all">View <ArrowRight className="w-3 h-3" /></span>
                </div>
            </div>
        </div>
    );
}

function EventListRow({ event }: { event: any }) {
    const router = useRouter();
    const isSoldOut = event.soldCount >= event.capacity;

    return (
        <div
            onClick={() => router.push(`/event/${event.id}`)}
            className="group cursor-pointer flex gap-4 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden transition-all hover:bg-zinc-900 p-3"
        >
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                {event.imageUrl
                    ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-2xl">{CATEGORY_ICONS[event.category]}</div>
                }
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm group-hover:text-red-400 transition line-clamp-1 mb-1">{event.name}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-zinc-400 text-xs mb-1">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {event.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.soldCount}/{event.capacity}</span>
                </div>
            </div>
            <div className="flex flex-col items-end justify-between shrink-0">
                <span className="text-white font-bold text-sm">{event.price === 0 ? 'FREE' : `₹${event.price.toLocaleString('en-IN')}`}</span>
                {isSoldOut
                    ? <span className="text-xs text-red-400 font-medium">Sold Out</span>
                    : <span className="text-xs text-red-400 group-hover:text-red-300 flex items-center gap-0.5">Register <ArrowRight className="w-3 h-3" /></span>
                }
            </div>
        </div>
    );
}
