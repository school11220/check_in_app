'use client';

import { useApp, CATEGORY_COLORS } from '@/lib/store';
import { useState } from 'react';
import TicketForm from '@/components/TicketForm';
import { Calendar, MapPin, ScanLine, LayoutDashboard, LogIn, X, Menu, Ticket } from 'lucide-react';

export default function Home() {
  const { events, isAdminLoggedIn, siteSettings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMenu, setShowMenu] = useState(false);

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
    <main className="min-h-screen bg-black flex flex-col">
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
        <div className={`absolute bottom-16 right-0 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl transition-all ${showMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {isAdminLoggedIn && (
            <>
              <a href="/checkin" className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-800 whitespace-nowrap">
                <ScanLine className="w-5 h-5" />
                Staff Check-In
              </a>
              <a href="/admin" className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-800 whitespace-nowrap border-t border-zinc-800">
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </a>
            </>
          )}
          {!isAdminLoggedIn && siteSettings.showAdminLink && (
            <a href="/admin" className="flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-800 whitespace-nowrap">
              <LogIn className="w-5 h-5" />
              Admin Login
            </a>
          )}
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          {showMenu ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      <div className="flex-1">
        {/* Hero - Conditionally rendered based on siteSettings */}
        {siteSettings.showHero && (
          <section className="relative py-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-transparent" />
            <div className="max-w-4xl mx-auto text-center relative">
              <div className="inline-flex items-center gap-2 bg-red-900/30 text-red-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Live Events
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                {siteSettings.heroTitle}
              </h1>
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                {siteSettings.heroSubtitle}
              </p>
            </div>
          </section>
        )}

        {/* Category Filter - Conditionally rendered */}
        {siteSettings.showCategories && (
          <section className="px-4 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Events Grid - Conditionally rendered */}
        {siteSettings.showEventsGrid && (
          <section className="px-4 pb-12">
            <div className="max-w-7xl mx-auto">
              <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6`}>
                {filteredEvents.slice(0, siteSettings.eventsPerPage || 12).map(event => {
                  const categoryStyle = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;
                  const isSoldOut = event.soldCount >= event.capacity;
                  const capacityPercent = Math.round((event.soldCount / event.capacity) * 100);

                  return (
                    <a
                      key={event.id}
                      href={`/event/${event.id}`}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-red-900/50 transition-all group"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={event.imageUrl}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
                          {event.category}
                        </span>
                        {isSoldOut && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                            SOLD OUT
                          </div>
                        )}
                        {capacityPercent >= 80 && !isSoldOut && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-yellow-600 text-white rounded-full text-xs font-bold">
                            ALMOST FULL
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3">
                          <p className="text-2xl font-bold text-white">₹{(event.price / 100).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-400 transition-colors">
                          {event.name}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.venue.split(',')[0]}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
              {filteredEvents.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-zinc-500">No events in this category</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Ticket Purchase Section - Conditionally rendered */}
        {siteSettings.showTicketForm && (
          <section id="buy" className="py-16 px-4 bg-gradient-to-b from-black to-zinc-900">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-3">Get Your Tickets</h2>
                <p className="text-zinc-400">Select an event and complete your registration</p>
              </div>
              <TicketForm />
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-500 text-sm">{siteSettings.footerText}</p>
        </div>
      </footer>
    </main>
  );
}

