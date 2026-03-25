'use client';

import { useState, useEffect } from 'react';
import { ScanLine, LayoutDashboard, LogIn, X, Menu, Ticket, LogOut, Home as HomeIcon } from 'lucide-react';
import { useAuth, useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import { SiteSettings } from '@/lib/store';

interface HomeClientProps {
    initialSettings: SiteSettings;
    initialEvents: {
        id: string;
        name: string;
        date: string;
        venue: string | null;
        price: number;
        imageUrl: string | null;
        isFeatured: boolean;
        soldCount: number;
        capacity: number;
    }[];
}

export default function HomeClient({ initialSettings, initialEvents }: HomeClientProps) {
    const [siteSettings] = useState<SiteSettings>(initialSettings);
    const [events] = useState(initialEvents);
    const [showMenu, setShowMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const { isSignedIn } = useAuth();
    const { signOut } = useClerk();

    const handleLogout = async () => {
        await signOut({ redirectUrl: '/' });
        setShowMenu(false);
    };

    const handleRegisterForEvent = (eventId: string) => {
        localStorage.setItem('selectedEventId', eventId);
        window.location.href = '/register';
    };

    return (
        <main className="min-h-screen bg-[#0B0B0B] flex flex-col">
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
                <a
                    href="/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center w-16 h-full text-[#B3B3B3] hover:text-white transition-colors"
                >
                    <Ticket className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">Tickets</span>
                </a>
                <button
                    onClick={() => setShowMenu(true)}
                    className="flex flex-col items-center justify-center w-16 h-full text-[#B3B3B3] hover:text-white transition-colors"
                >
                    <Menu className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>

            {/* Mobile Menu Drawer */}
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

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0B0B0B]/90 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.png" alt="EventHub" width={40} height={40} className="rounded-xl" priority />
                        <span className="font-heading text-lg font-bold text-white hidden sm:block">EventHub</span>
                    </div>
                    <a href="/register" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#E11D2E] text-white text-sm font-medium rounded-xl hover:bg-[#B91C1C] transition-colors flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        Get Tickets
                    </a>
                </div>
            </header>

            {/* Main Content — Simple Landing */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative overflow-hidden noise-texture">
                <div className="absolute inset-0 ambient-glow-red pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B0B0B] pointer-events-none" />

                <div className="relative z-10 text-center max-w-3xl mx-auto">
                    <h1 className="font-heading text-3xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                        {siteSettings.heroTitle}
                    </h1>
                    <p className="text-base md:text-xl text-[#B3B3B3] max-w-2xl mx-auto leading-relaxed mb-10 px-4">
                        {siteSettings.heroSubtitle}
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
            </div>

            {/* Upcoming Events */}
            <section className="px-4 pb-16">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-heading text-2xl md:text-3xl font-bold text-white">Upcoming Events</h2>
                        <a href="/discover" className="text-sm text-[#E11D2E] hover:text-white transition-colors">View all</a>
                    </div>

                    {events.length === 0 ? (
                        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-8 text-center text-[#B3B3B3]">
                            No active events are available right now.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {events.map((event) => {
                                const eventDate = new Date(event.date);
                                const soldOut = event.soldCount >= event.capacity;

                                return (
                                    <article key={event.id} className="bg-[#141414] border border-[#1F1F1F] rounded-2xl overflow-hidden">
                                        <div className="h-36 bg-[#0D0D0D]">
                                            {event.imageUrl ? (
                                                <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[#737373] text-sm">No image</div>
                                            )}
                                        </div>
                                        <div className="p-5 space-y-2">
                                            <h3 className="text-white font-semibold line-clamp-2">{event.name}</h3>
                                            <p className="text-[#B3B3B3] text-sm">{eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            <p className="text-[#737373] text-sm line-clamp-1">{event.venue || 'Venue to be announced'}</p>
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="text-[#E11D2E] font-semibold">
                                                    {event.price === 0 ? 'Free' : `₹${Math.round(event.price / 100)}`}
                                                </span>
                                                <button
                                                    onClick={() => handleRegisterForEvent(event.id)}
                                                    disabled={soldOut}
                                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#E11D2E] text-white hover:bg-[#B91C1C] disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
                                                >
                                                    {soldOut ? 'Sold Out' : 'Register'}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#1F1F1F] py-10 px-4">
                <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
                    {siteSettings.socialLinks && siteSettings.socialLinks.length > 0 && (
                        <div className="flex items-center gap-6">
                            {siteSettings.socialLinks.map((link, i) => (
                                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#737373] hover:text-[#E11D2E] transition-colors">
                                    {link.platform}
                                </a>
                            ))}
                        </div>
                    )}
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
                                <a key={key} href={`/p/${page.slug}`} className="hover:text-white transition-colors">
                                    {label}
                                </a>
                            );
                        })}
                    </div>
                    <p className="text-[#737373] text-sm text-center">
                        {siteSettings.footerText}
                    </p>
                </div>
            </footer>
        </main>
    );
}
