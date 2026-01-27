'use client';

import { useApp, CATEGORY_COLORS, Event, SiteSettings } from '@/lib/store';
import { useState, useEffect } from 'react';
import { Calendar, MapPin, ScanLine, LayoutDashboard, LogIn, X, Menu, Ticket, LogOut, Search, Clock, Home as HomeIcon } from 'lucide-react';
import { useAuth, useClerk } from '@clerk/nextjs';

interface HomeClientProps {
    initialEvents: Event[];
    initialSettings: SiteSettings;
}

export default function HomeClient({ initialEvents, initialSettings }: HomeClientProps) {
    const [events, setEvents] = useState<Event[]>(initialEvents);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSettings);

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    // Prevent hydration mismatch by waiting for client mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Use Clerk's auth hooks directly
    const { isSignedIn } = useAuth();
    const { signOut } = useClerk();

    // Filter categories based on admin settings
    const categories = siteSettings.enabledCategories || ['all', 'music', 'tech', 'art', 'sports', 'food', 'gaming', 'business'];
    const filteredEvents = events.filter(event => {
        const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
        const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.venue.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Get featured event for schedule
    const featuredEvent = events.find(e => e.isFeatured) || events[0];

    // Grid column classes based on settings
    const gridColsClass = {
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
    }[siteSettings.eventsGridColumns || 3];

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const handleLogout = async () => {
        await signOut({ redirectUrl: '/' });
        setShowMenu(false);
    };

    return (
        <main className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
            {/* Announcement Banner */}
            {siteSettings.announcement?.isActive && siteSettings.announcement?.message && (
                <div
                    className="w-full py-2.5 px-4 text-center text-sm font-medium"
                    style={{ backgroundColor: siteSettings.announcement.bgColor, color: siteSettings.announcement.textColor }}
                    dangerouslySetInnerHTML={{
                        __html: siteSettings.announcement.message +
                            (siteSettings.announcement.linkText && siteSettings.announcement.linkUrl
                                ? ` <a href="${siteSettings.announcement.linkUrl}" class="ml-2 underline hover:no-underline">${siteSettings.announcement.linkText}</a>`
                                : '')
                    }}
                />
            )}

            {/* Floating Menu Button (Desktop Only) */}
            <div className="hidden md:block fixed bottom-6 right-6 z-50">
                <div className={`absolute bottom-16 right-0 glass rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${showMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    {mounted && isSignedIn && (
                        <>
                            <a href="/checkin" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-3.5 text-zinc-300 hover:bg-white/5 hover:text-white whitespace-nowrap transition-colors">
                                <ScanLine className="w-5 h-5" />
                                Staff Check-In
                            </a>
                            <a href="/admin" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-3.5 text-zinc-300 hover:bg-white/5 hover:text-white whitespace-nowrap border-t border-white/5 transition-colors">
                                <LayoutDashboard className="w-5 h-5" />
                                Dashboard
                            </a>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-5 py-3.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 whitespace-nowrap border-t border-white/5 transition-colors w-full"
                            >
                                <LogOut className="w-5 h-5" />
                                Logout
                            </button>
                        </>
                    )}
                    {mounted && !isSignedIn && (
                        <a href="/login" className="flex items-center gap-3 px-5 py-3.5 text-zinc-300 hover:bg-white/5 hover:text-white whitespace-nowrap transition-colors">
                            <LogIn className="w-5 h-5" />
                            Login
                        </a>
                    )}
                </div>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-14 h-14 bg-gradient-to-br from-[#E11D2E] to-[#B91C1C] rounded-full shadow-lg shadow-red-900/30 flex items-center justify-center hover:scale-105 transition-all duration-300 glow-hover"
                >
                    {showMenu ? (
                        <X className="w-6 h-6 text-white" />
                    ) : (
                        <Menu className="w-6 h-6 text-white" />
                    )}
                </button>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0B0B]/95 backdrop-blur-lg border-t border-white/10 z-50 flex items-center justify-around px-8">
                <button
                    onClick={() => scrollToSection('search')}
                    className="flex flex-col items-center justify-center w-16 h-full text-[#B3B3B3] hover:text-white transition-colors"
                >
                    <Search className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                <div className="relative -top-5">
                    <a
                        href="/register"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[#E11D2E] to-[#B91C1C] rounded-full shadow-lg shadow-red-900/40 border-4 border-[#0B0B0B]"
                    >
                        <Ticket className="w-6 h-6 text-white" />
                    </a>
                </div>

                <button
                    onClick={() => setShowMenu(true)}
                    className="flex flex-col items-center justify-center w-16 h-full text-[#B3B3B3] hover:text-white transition-colors"
                >
                    <Menu className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>

            {/* Mobile Menu Drawer (Simplified) */}
            {showMenu && (
                <div className="md:hidden fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-end animate-fade-in-up">
                    <div className="w-full bg-[#141414] rounded-t-2xl p-6 border-t border-[#1F1F1F]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Menu</h3>
                            <button onClick={() => setShowMenu(false)} className="p-2 bg-zinc-800 rounded-full text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {mounted && isSignedIn ? (
                                <>
                                    <a href="/admin" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl text-white">
                                        <LayoutDashboard className="w-5 h-5 text-[#E11D2E]" />
                                        <span className="font-medium">Admin Dashboard</span>
                                    </a>
                                    <a href="/checkin" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl text-white">
                                        <ScanLine className="w-5 h-5 text-[#E11D2E]" />
                                        <span className="font-medium">Staff Check-In</span>
                                    </a>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-4 p-4 bg-red-900/20 text-red-500 rounded-xl mt-4"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        <span className="font-medium">Logout</span>
                                    </button>
                                </>
                            ) : mounted ? (
                                <a href="/login" className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl text-white">
                                    <LogIn className="w-5 h-5 text-[#E11D2E]" />
                                    <span className="font-medium">Login</span>
                                </a>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}


            {/* Header with Logo */}
            <header className="sticky top-0 z-40 bg-[#0B0B0B]/90 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="EventHub" className="w-10 h-10 rounded-xl" />
                        <span className="font-heading text-lg font-bold text-white hidden sm:block">EventHub</span>
                    </div>
                    <a href="/register" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#E11D2E] text-white text-sm font-medium rounded-xl hover:bg-[#B91C1C] transition-colors flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        Get Tickets
                    </a>
                </div>
            </header>

            <div className="flex-1">

                {/* Hero - Premium Design */}
                <section className="relative py-16 md:py-32 px-4 overflow-hidden noise-texture">

                    {/* Ambient glow behind hero */}
                    <div className="absolute inset-0 ambient-glow-red pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B0B0B] pointer-events-none" />

                    <div className="max-w-5xl mx-auto text-center relative z-10">
                        {/* Live Events Pill */}
                        <div className="inline-flex items-center gap-2.5 bg-[#E11D2E]/10 border border-[#E11D2E]/20 text-[#FF6B7A] px-5 py-2.5 rounded-full text-sm font-medium mb-8 backdrop-blur-sm animate-fade-in-up glow-red-sm">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D2E] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E11D2E]"></span>
                            </span>
                            Live Events
                        </div>

                        {/* Hero Title */}
                        <h1 className="font-heading text-3xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 tracking-tight animate-fade-in-up animation-delay-100" style={{ letterSpacing: '-0.03em' }}>
                            {siteSettings.heroTitle}
                        </h1>

                        {/* Hero Subtitle */}
                        <p className="text-base md:text-xl text-[#B3B3B3] max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200 px-4">
                            {siteSettings.heroSubtitle}
                        </p>
                    </div>
                </section>


                {/* Search & Filter Section */}
                <section id="search" className="px-4 py-8 sticky top-0 z-40 backdrop-blur-xl bg-[#0B0B0B]/80 border-b border-white/5">

                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Search Bar */}
                        <div className="relative max-w-xl mx-auto">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search events by name or venue..."
                                className="block w-full pl-11 pr-4 py-3 bg-[#141414] border border-[#1F1F1F] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E11D2E] focus:border-transparent transition-all shadow-lg text-base"
                            />

                        </div>

                        {/* Category Pills */}

                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-hide snap-x">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 snap-center border ${selectedCategory === cat
                                        ? 'bg-[#E11D2E] text-white border-[#E11D2E] shadow-[0_0_24px_rgba(225,29,46,0.4)] scale-105'
                                        : 'bg-[#141414] text-[#B3B3B3] border-[#1F1F1F] hover:bg-[#1A1A1A] hover:border-[#2A2A2A] hover:text-white'
                                        }`}
                                >
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>


                {/* Dynamic Schedule Section */}
                {featuredEvent && featuredEvent.schedule && featuredEvent.schedule.length > 0 && (
                    <section className="py-20 px-4 bg-[#111111]">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-16">
                                <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">Event Schedule</h2>
                                <p className="text-[#B3B3B3]">Agenda for <span className="text-[#E11D2E]">{featuredEvent.name}</span></p>
                            </div>
                            <div className="space-y-4">
                                {featuredEvent.schedule.map((item, i) => (
                                    <div key={item.id || i} className="flex flex-col md:flex-row gap-4 md:items-center p-6 rounded-xl bg-[#141414] border border-[#1F1F1F] hover:border-[#E11D2E]/30 transition-all group">
                                        <div className="w-32 flex items-center gap-2 font-mono text-[#E11D2E] font-medium">
                                            <Clock className="w-4 h-4" />
                                            {item.time}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white group-hover:text-[#E11D2E] transition-colors">{item.title}</h3>
                                            <p className="text-sm text-[#737373] mt-1">{item.description}</p>
                                            {item.speaker && (
                                                <div className="mt-2 text-xs text-zinc-500 bg-zinc-900/50 inline-block px-2 py-1 rounded border border-zinc-800">
                                                    Speaker: {item.speaker}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}



                {/* Events Grid - Enhanced Cards */}
                <section className="px-4 pb-32 pt-8">

                    <div className="max-w-6xl mx-auto">
                        <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6 md:gap-8 pb-10 md:pb-0`}>
                            {filteredEvents.slice(0, siteSettings.eventsPerPage || 12).map((event, index) => {
                                const categoryStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
                                const isSoldOut = event.soldCount >= event.capacity;
                                const capacityPercent = Math.round((event.soldCount / event.capacity) * 100);

                                return (
                                    <a
                                        key={event.id}
                                        href={`/event/${event.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="glass-card rounded-2xl overflow-hidden border border-[#1F1F1F] hover:border-[#E11D2E]/30 transition-all duration-500 group relative card-hover animate-fade-in-up"
                                        style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
                                    >
                                        {/* Image Container - Fixed Height */}
                                        <div className="relative h-48 overflow-hidden">
                                            <img
                                                src={event.imageUrl}
                                                alt={event.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                            />
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/40 to-transparent" />

                                            {/* Category Badge */}
                                            <span className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${categoryStyle.bg} ${categoryStyle.text} backdrop-blur-sm border border-white/10`}>
                                                {event.category}
                                            </span>

                                            {/* Status Badges */}
                                            {isSoldOut && (
                                                <div className="absolute top-4 right-4 px-3 py-1.5 bg-[#E11D2E] text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                                                    SOLD OUT
                                                </div>
                                            )}
                                            {capacityPercent >= 80 && !isSoldOut && (
                                                <div className="absolute top-4 right-4 px-3 py-1.5 bg-[#FACC15] text-black rounded-full text-xs font-bold uppercase tracking-wide">
                                                    ALMOST FULL
                                                </div>
                                            )}

                                            {/* Price Badge - Mono Font */}
                                            <div className="absolute bottom-4 left-4">
                                                <p className="font-mono text-2xl font-bold text-white drop-shadow-lg">
                                                    ₹{(event.price / 100).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-5">
                                            <h3 className="font-heading text-lg font-semibold text-white mb-3 group-hover:text-[#FF6B7A] transition-colors duration-300 line-clamp-1">
                                                {event.name}
                                            </h3>

                                            <div className="flex items-center gap-4 text-sm text-[#737373]">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-[#E11D2E]/70" />
                                                    {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin className="w-4 h-4 text-[#E11D2E]/70" />
                                                    {event.venue.split(',')[0]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="p-4 flex items-center justify-between border-t border-[#1F1F1F] bg-[#141414]">
                                            <div className="flex flex-col">
                                                <span className="text-[#B3B3B3] text-xs uppercase tracking-wider font-medium mb-0.5">Price</span>
                                                <span className="text-white font-bold text-lg">
                                                    {event.price === 0 ? 'Free' : `₹${(event.price / 100).toLocaleString()}`}
                                                </span>
                                            </div>
                                            <button
                                                disabled={!event.isActive || siteSettings.globalSalesPaused || isSoldOut}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${!event.isActive || siteSettings.globalSalesPaused
                                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                                                    : isSoldOut
                                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                                                        : 'bg-white text-black hover:bg-[#E11D2E] hover:text-white hover:scale-105 shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed'
                                                    }`}
                                            >
                                                {(!event.isActive || siteSettings.globalSalesPaused) ? (
                                                    <>
                                                        <X className="w-4 h-4" />
                                                        {siteSettings.globalSalesPaused ? 'On Hold' : 'Unavailable'}
                                                    </>
                                                ) : isSoldOut ? (
                                                    <>
                                                        <X className="w-4 h-4" />
                                                        Sold Out
                                                    </>
                                                ) : (
                                                    <>
                                                        <Ticket className="w-4 h-4" />
                                                        Get Tickets
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Hover Glow Effect */}
                                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(225, 29, 46, 0.05)' }} />
                                    </a>
                                );
                            })}
                        </div>

                        {filteredEvents.length === 0 && (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#141414] border border-[#1F1F1F] flex items-center justify-center">
                                    <Ticket className="w-8 h-8 text-[#737373]" />
                                </div>
                                <p className="text-[#737373] text-lg">No events in this category</p>
                            </div>
                        )}
                    </div>

                </section>







                {/* Register CTA */}
                <section id="buy" className="py-20 px-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#0F0F0F] to-[#0B0B0B] pointer-events-none" />
                    <div className="max-w-3xl mx-auto relative z-10 text-center">
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
                            Ready to Join?
                        </h2>
                        <p className="text-[#B3B3B3] text-lg mb-8">
                            Get your tickets now and be part of something amazing
                        </p>
                        <a
                            href="/register"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#E11D2E] to-[#B91C1C] text-white font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-red-900/30 glow-hover"
                        >
                            <Ticket className="w-5 h-5" />
                            Register Now
                        </a>
                    </div>
                </section>
            </div >

            {/* Footer */}
            {/* Footer */}
            <footer className="border-t border-[#1F1F1F] py-10 px-4">
                <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
                    {/* Social Links */}
                    {siteSettings.socialLinks && siteSettings.socialLinks.length > 0 && (
                        <div className="flex items-center gap-6">
                            {siteSettings.socialLinks.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#737373] hover:text-[#E11D2E] transition-colors"
                                >
                                    {link.platform}
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Legal Links */}
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[#737373]">
                        {[
                            { key: 'privacyPolicy', label: 'Privacy Policy' },
                            { key: 'termsOfService', label: 'Terms of Service' },
                            { key: 'refundPolicy', label: 'Refund Policy' },
                            { key: 'cookiePolicy', label: 'Cookie Policy' },
                        ].map(({ key, label }) => {
                            const pageId = siteSettings.legalPages?.[key as keyof typeof siteSettings.legalPages];
                            const page = siteSettings.customPages?.find(p => p.id === pageId);

                            if (!page || !page.isPublished) return null;

                            return (
                                <a
                                    key={key}
                                    href={`/p/${page.slug}`}
                                    className="hover:text-white transition-colors"
                                >
                                    {label}
                                </a>
                            );
                        })}
                    </div>

                    {/* Copyright */}
                    <p className="text-[#737373] text-sm text-center">
                        {siteSettings.footerText}
                    </p>
                </div>
            </footer>
        </main >
    );
}
