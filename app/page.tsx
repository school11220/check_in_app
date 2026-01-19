'use client';

import { useApp, CATEGORY_COLORS } from '@/lib/store';
import { useState, useEffect } from 'react';
import { Calendar, MapPin, ScanLine, LayoutDashboard, LogIn, X, Menu, Ticket, LogOut } from 'lucide-react';

export default function Home() {
  const { events, siteSettings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check actual auth state from API
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        setIsLoggedIn(res.ok);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // Filter categories based on admin settings
  const categories = siteSettings.enabledCategories || ['all', 'music', 'tech', 'art', 'sports', 'food', 'gaming', 'business'];
  const filteredEvents = selectedCategory === 'all'
    ? events.filter(e => e.isActive)
    : events.filter(e => e.category === selectedCategory && e.isActive);

  // Grid column classes based on settings
  const gridColsClass = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  }[siteSettings.eventsGridColumns || 3];

  return (
    <main className="min-h-screen bg-[#0B0B0B] flex flex-col">
      {/* Announcement Banner */}
      {siteSettings.announcement?.isActive && siteSettings.announcement?.message && (
        <div
          className="w-full py-2.5 px-4 text-center text-sm font-medium"
          style={{ backgroundColor: siteSettings.announcement.bgColor, color: siteSettings.announcement.textColor }}
        >
          {siteSettings.announcement.message}
          {siteSettings.announcement.linkText && siteSettings.announcement.linkUrl && (
            <a href={siteSettings.announcement.linkUrl} className="ml-2 underline hover:no-underline">
              {siteSettings.announcement.linkText}
            </a>
          )}
        </div>
      )}

      {/* Floating Menu Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className={`absolute bottom-16 right-0 glass rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${showMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {isLoggedIn && (
            <>
              <a href="/checkin" className="flex items-center gap-3 px-5 py-3.5 text-zinc-300 hover:bg-white/5 hover:text-white whitespace-nowrap transition-colors">
                <ScanLine className="w-5 h-5" />
                Staff Check-In
              </a>
              <a href="/admin" className="flex items-center gap-3 px-5 py-3.5 text-zinc-300 hover:bg-white/5 hover:text-white whitespace-nowrap border-t border-white/5 transition-colors">
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </a>
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  setIsLoggedIn(false);
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 px-5 py-3.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 whitespace-nowrap border-t border-white/5 transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </>
          )}
          {!isLoggedIn && (
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

      {/* Header with Logo */}
      <header className="sticky top-0 z-40 bg-[#0B0B0B]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="EventHub" className="w-10 h-10 rounded-xl" />
            <span className="font-heading text-lg font-bold text-white hidden sm:block">EventHub</span>
          </div>
          <a href="/register" className="px-4 py-2 bg-[#E11D2E] text-white text-sm font-medium rounded-xl hover:bg-[#B91C1C] transition-colors flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Get Tickets
          </a>
        </div>
      </header>

      <div className="flex-1">
        {/* Hero - Premium Design */}
        {siteSettings.showHero && (
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
        )}

        {/* Category Filter - Premium Pills */}
        {siteSettings.showCategories && (
          <section className="px-4 py-8 sticky top-0 z-40 backdrop-blur-xl bg-[#0B0B0B]/80 border-b border-white/5">
            <div className="max-w-6xl mx-auto">
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
        )}

        {/* Features Section */}
        {siteSettings.showFeatures && (
          <section className="py-20 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">Why Attend?</h2>
                <p className="text-[#B3B3B3] max-w-2xl mx-auto">Experience the best in live entertainment and networking</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: 'World-Class Speakers', icon: '🎤', desc: 'Learn from industry leaders and visionaries' },
                  { title: 'Interactive Workshops', icon: '💡', desc: 'Hands-on sessions to build new skills' },
                  { title: 'Networking', icon: '🤝', desc: 'Connect with peers and potential partners' }
                ].map((feature, i) => (
                  <div key={i} className="bg-[#141414] p-8 rounded-2xl border border-[#1F1F1F] hover:border-[#E11D2E]/50 transition-colors">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-[#737373]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Schedule Preview */}
        {siteSettings.showSchedule && (
          <section className="py-20 px-4 bg-[#111111]">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">Event Schedule</h2>
                <p className="text-[#B3B3B3]">A packed day of excitement</p>
              </div>
              <div className="space-y-4">
                {[
                  { time: '09:00 AM', title: 'Registration & Breakfast', type: 'Networking' },
                  { time: '10:00 AM', title: 'Opening Keynote', type: 'Talk' },
                  { time: '12:00 PM', title: 'Networking Lunch', type: 'Break' },
                  { time: '02:00 PM', title: 'Panel Discussions', type: 'Panel' },
                  { time: '05:00 PM', title: 'Closing Remarks', type: 'Talk' }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col md:flex-row gap-4 md:items-center p-6 rounded-xl bg-[#141414] border border-[#1F1F1F] hover:border-[#E11D2E]/30 transition-all">
                    <div className="w-32 font-mono text-[#E11D2E] font-medium">{item.time}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{item.title}</h3>
                      <span className="text-sm text-[#737373]">{item.type}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <button className="text-white border-b border-[#E11D2E] hover:text-[#E11D2E] transition-colors pb-1">View Full Schedule</button>
              </div>
            </div>
          </section>
        )}

        {/* Events Grid - Enhanced Cards */}
        {siteSettings.showEventsGrid && (
          <section className="px-4 pb-32 pt-8">
            <div className="max-w-6xl mx-auto">
              <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6 md:gap-8`}>
                {filteredEvents.slice(0, siteSettings.eventsPerPage || 12).map((event, index) => {
                  const categoryStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
                  const isSoldOut = event.soldCount >= event.capacity;
                  const capacityPercent = Math.round((event.soldCount / event.capacity) * 100);

                  return (
                    <a
                      key={event.id}
                      href={`/event/${event.id}`}
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
        )}


        {/* Sponsors Section */}
        {siteSettings.showSponsors && (
          <section className="py-20 px-4">
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="font-heading text-2xl font-bold text-white mb-10 text-opacity-50">TRUSTED BY</h2>
              <div className="flex flex-wrap justify-center gap-12 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {['Google', 'Microsoft', 'Spotify', 'Amazon', 'Netflix'].map((sponsor) => (
                  <div key={sponsor} className="text-2xl font-bold text-white">{sponsor}</div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="py-20 px-4 bg-[#0A0A0A]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
              <p className="text-[#B3B3B3]">Everything you need to know about ticketing</p>
            </div>
            <div className="space-y-4">
              {[
                { q: 'How do I purchase tickets?', a: 'Click on any event to view details, then click "Get Tickets" to proceed to registration. You can pay securely using UPI, cards, or net banking.' },
                { q: 'Can I get a refund?', a: 'Refund policies vary by event. Please check the event details page for specific terms. Most events allow cancellations up to 48 hours before the event.' },
                { q: 'How do I access my ticket?', a: 'After purchase, you\'ll receive your ticket via email with a QR code. You can also access it anytime by visiting the ticket link sent to you.' },
                { q: 'What if I lose my ticket?', a: 'Don\'t worry! Your ticket is linked to your email. Contact our support team and we\'ll resend it to you.' },
                { q: 'Can I transfer my ticket to someone else?', a: 'Yes, most events allow ticket transfers. Check the event details or contact the organizer for transfer options.' },
              ].map((faq, i) => (
                <details key={i} className="group bg-[#141414] rounded-2xl border border-[#1F1F1F] hover:border-[#E11D2E]/30 transition-colors">
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                    <span className="text-white font-medium pr-4">{faq.q}</span>
                    <span className="text-[#E11D2E] group-open:rotate-45 transition-transform">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-6 text-[#B3B3B3] leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
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
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#E11D2E] to-[#B91C1C] text-white font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-red-900/30 glow-hover"
            >
              <Ticket className="w-5 h-5" />
              Register Now
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1F1F1F] py-10 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#737373] text-sm">{siteSettings.footerText}</p>
        </div>
      </footer>
    </main>
  );
}
