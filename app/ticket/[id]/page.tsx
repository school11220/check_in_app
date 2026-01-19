'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/store';
import { generateQRCode } from '@/lib/utils';
import { useToast } from '@/components/Toaster';
import { downloadCalendarEvent, getGoogleCalendarUrl, canShare, shareTicket } from '@/lib/calendar-utils';

interface TicketData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  eventId: string;
  status: string;
  token: string | null;
  checkedIn: boolean;
  createdAt: string;
  event?: {
    id: string;
    name: string;
    date: string;
    venue: string | null;
    price: number;
    description?: string;
    imageUrl?: string;
  };
}

export default function TicketPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticketId = params.id as string;
  const success = searchParams.get('success');
  // Get siteSettings from store
  const { siteSettings } = useApp();
  const { showToast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Calendar event data helper
  const getEventDate = () => {
    if (!ticket?.event?.date) return new Date();
    return new Date(ticket.event.date);
  };

  // Handle Add to Calendar (.ics download)
  const handleAddToCalendar = () => {
    if (!ticket?.event) return;

    downloadCalendarEvent({
      title: ticket.event.name,
      description: `Your ticket for ${ticket.event.name}. Ticket ID: ${ticket.id}`,
      location: ticket.event.venue || undefined,
      startDate: getEventDate(),
      url: `${window.location.origin}/ticket/${ticket.id}`,
    }, `event-${ticket.event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`);

    showToast('Calendar event downloaded!', 'success');
  };

  // Get Google Calendar link
  const getGoogleCalendarLink = () => {
    if (!ticket?.event) return '#';

    return getGoogleCalendarUrl({
      title: ticket.event.name,
      description: `Your ticket for ${ticket.event.name}. Ticket ID: ${ticket.id}`,
      location: ticket.event.venue || undefined,
      startDate: getEventDate(),
    });
  };

  // Handle Share
  const handleShare = async () => {
    const ticketUrl = `${window.location.origin}/ticket/${ticket?.id}`;
    const shareData = {
      title: `Ticket for ${ticket?.event?.name || 'Event'}`,
      text: `Check out my ticket for ${ticket?.event?.name}!`,
      url: ticketUrl,
    };

    if (canShare()) {
      const success = await shareTicket(shareData);
      if (!success) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(ticketUrl);
        showToast('Ticket link copied to clipboard!', 'success');
      }
    } else {
      // Fallback to clipboard for desktop
      await navigator.clipboard.writeText(ticketUrl);
      showToast('Ticket link copied to clipboard!', 'success');
    }
  };

  useEffect(() => {
    if (ticketId) { // Ensure ticketId is available before fetching
      fetchTicket();
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`);
      if (!response.ok) throw new Error('Ticket not found');
      const data = await response.json();

      if (data.ticket) {
        setTicket(data.ticket);
        // JSON format for the separate check-in app
        const qrPayload = JSON.stringify({
          ticketId: data.ticket.id,
          token: data.ticket.token
        });
        const qr = await generateQRCode(qrPayload);
        setQrCode(qr);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      showToast('Failed to load ticket details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadTicket = async () => {
    if (!ticketRef.current || !ticket || !siteSettings) return;
    setDownloading(true);

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Apply custom styles temporarily for capture if needed, or rely on React rendering
      // We'll clone the element to modify styles safely
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null, // Transparent to capture rounded corners properly
        onclone: (document) => {
          const el = document.getElementById('ticket-node'); // Assuming your ticket root div has this ID
          if (el) {
            // Ensure all custom styles are applied in the clone
            (el as HTMLElement).style.fontFamily = siteSettings.ticketFontFamily || 'Inter, sans-serif';
            // Fix for gradient if needed - this part would be more complex
            // and might involve replacing CSS background properties if they use non-standard functions
          }
          // Original fix for lab() color function error, adapted for the new onclone structure
          const elements = document.querySelectorAll('*');
          elements.forEach((el) => {
            const style = window.getComputedStyle(el);
            const bgColor = style.backgroundColor;
            const color = style.color;
            // Replace any lab() or oklch() colors with fallback
            if (bgColor.includes('lab') || bgColor.includes('oklch')) {
              (el as HTMLElement).style.backgroundColor = '#000000';
            }
            if (color.includes('lab') || color.includes('oklch')) {
              (el as HTMLElement).style.color = '#ffffff';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`ticket-${ticket.event?.name || 'event'}-${ticket.id.slice(-8)}.pdf`);
      showToast('Ticket downloaded!', 'success');
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Download failed. Try screenshot instead.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-900 rounded-full mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-gray-400 mb-6">{error || 'Ticket not found'}</p>
          <a href="/" className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-medium">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#000000] py-8 px-4">
      <div className="max-w-xl mx-auto">
        {success === 'true' && (
          <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-400 font-medium">Payment successful! Your ticket is ready.</p>
          </div>
        )}

        {/* Ticket Card */}
        <div
          id="ticket-node"
          ref={ticketRef}
          style={{
            backgroundColor: siteSettings.ticketBgColor || '#111111',
            borderColor: siteSettings.ticketBorderColor || '#333333',
            borderRadius: `${siteSettings.ticketBorderRadius || 24}px`,
            fontFamily: siteSettings.ticketFontFamily === 'playfair' ? 'Georgia, serif'
              : siteSettings.ticketFontFamily === 'montserrat' ? 'Montserrat, sans-serif'
                : siteSettings.ticketFontFamily === 'roboto' ? 'Roboto, sans-serif'
                  : 'Inter, sans-serif'
          }}
          className={`border ${siteSettings.ticketBorderStyle === 'none' ? 'border-0' : siteSettings.ticketBorderStyle === 'dashed' ? 'border-dashed' : 'border-solid'} overflow-hidden shadow-2xl relative ${siteSettings.ticketCompactMode ? 'max-w-sm mx-auto' : ''}`}
        >
          {/* Pattern Overlay */}
          {siteSettings.ticketShowPattern && siteSettings.ticketPatternType !== 'none' && (
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0"
              style={{
                backgroundImage: siteSettings.ticketPatternType === 'dots'
                  ? `radial-gradient(${siteSettings.ticketTextColor || '#ffffff'} 1px, transparent 1px)`
                  : siteSettings.ticketPatternType === 'lines'
                    ? `repeating-linear-gradient(45deg, transparent, transparent 10px, ${siteSettings.ticketTextColor || '#ffffff'} 10px, ${siteSettings.ticketTextColor || '#ffffff'} 11px)`
                    : siteSettings.ticketPatternType === 'grid'
                      ? `linear-gradient(${siteSettings.ticketTextColor || '#ffffff'} 1px, transparent 1px), linear-gradient(90deg, ${siteSettings.ticketTextColor || '#ffffff'} 1px, transparent 1px)`
                      : 'none',
                backgroundSize: siteSettings.ticketPatternType === 'dots' ? '20px 20px' :
                  siteSettings.ticketPatternType === 'lines' ? '10px 10px' :
                    siteSettings.ticketPatternType === 'grid' ? '20px 20px' : 'auto'
              }}
            />
          )}

          {/* Watermark */}
          {siteSettings.ticketWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-5">
              <p
                className="text-5xl font-bold opacity-5 whitespace-nowrap"
                style={{
                  transform: 'rotate(-30deg)',
                  color: siteSettings.ticketTextColor || '#ffffff',
                  letterSpacing: '0.1em'
                }}
              >
                {siteSettings.ticketWatermark}
              </p>
            </div>
          )}

          {/* Event Image Banner */}
          {siteSettings.ticketShowEventImage && (
            <div className="relative h-32 overflow-hidden">
              <img
                src={ticket.event?.imageUrl || siteSettings.ticketHeaderImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'}
                alt="Event"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
            </div>
          )}

          {/* Header */}
          <div
            style={{
              background: siteSettings.ticketHeaderStyle === 'image' && siteSettings.ticketHeaderImage
                ? `url(${siteSettings.ticketHeaderImage}) center/cover`
                : siteSettings.ticketGradient
                  ? `linear-gradient(135deg, ${siteSettings.ticketAccentColor || '#dc2626'}, ${siteSettings.ticketGradientColor || '#991b1b'})`
                  : (siteSettings.ticketAccentColor || '#dc2626'),
              color: '#ffffff'
            }}
            className={`px-6 ${siteSettings.ticketCompactMode ? 'py-4' : 'py-6'} relative overflow-hidden z-10`}
          >
            {siteSettings.ticketLogoUrl && (
              <img src={siteSettings.ticketLogoUrl} alt="Logo" className="absolute top-4 right-4 h-8 object-contain opacity-80" />
            )}
            {!siteSettings.ticketLogoUrl && (
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
            )}

            <div className="relative">
              <div className="flex items-center gap-2 text-sm mb-2 opacity-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                {siteSettings.ticketBadgeText || 'VIP ACCESS'}
              </div>
              <h1 className={`font-bold ${siteSettings.ticketCompactMode ? 'text-xl' : 'text-2xl'}`}>{ticket.event?.name || 'Event Ticket'}</h1>
              {siteSettings.ticketShowEventDescription && ticket.event?.description && (
                <p className="text-sm opacity-80 mt-1 line-clamp-2">{ticket.event.description}</p>
              )}
            </div>
          </div>

          {/* Perforation */}
          {(siteSettings.ticketShowPerforation !== false) && (
            <div className="relative flex items-center z-10 bg-transparent">
              <div className="absolute left-0 w-4 h-8 rounded-r-full" style={{ backgroundColor: '#000000' }}></div>
              <div className="flex-1 border-t-2 border-dashed mx-4" style={{ borderColor: siteSettings.ticketBorderColor || '#444444' }}></div>
              <div className="absolute right-0 w-4 h-8 rounded-l-full" style={{ backgroundColor: '#000000' }}></div>
            </div>
          )}

          {/* Body */}
          <div className={`${siteSettings.ticketCompactMode ? 'p-4' : 'p-6'} relative z-10`}>
            {/* Date & Venue Grid */}
            {(siteSettings.ticketShowDate !== false || siteSettings.ticketShowVenue !== false) && (
              <div className={`grid ${siteSettings.ticketShowDate !== false && siteSettings.ticketShowVenue !== false ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-6`}>
                {siteSettings.ticketShowDate !== false && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 text-xs mb-1 opacity-70" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      DATE
                    </div>
                    <p className="font-semibold" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>
                      {ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBA'}
                    </p>
                  </div>
                )}
                {siteSettings.ticketShowVenue !== false && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 text-xs mb-1 opacity-70" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      VENUE
                    </div>
                    <p className="font-semibold truncate" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>{ticket.event?.venue || 'TBA'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Attendee */}
            <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <div className="text-xs mb-2 opacity-70" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>ATTENDEE</div>
              <p className="text-lg font-semibold" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>{ticket.name}</p>
              <p className="text-sm opacity-70" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>{ticket.email}</p>
            </div>

            {/* QR Code */}
            {qrCode && (siteSettings.ticketShowQrCode !== false) && (
              <div className={`flex flex-col ${siteSettings.ticketQrPosition === 'right' ? 'items-end' : siteSettings.ticketQrPosition === 'bottom' ? 'items-center' : 'items-center'}`}>
                <div
                  className="rounded-xl p-4 mb-3"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className={`${siteSettings.ticketQrSize === 'small' ? 'w-28 h-28' : siteSettings.ticketQrSize === 'large' ? 'w-48 h-48' : 'w-40 h-40'}`}
                  />
                </div>
                <p className="text-xs opacity-70" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>Ticket ID: {ticket.id.slice(-12).toUpperCase()}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {(siteSettings.ticketShowPrice !== false || siteSettings.ticketShowStatus !== false || siteSettings.ticketFooterText) && (
            <div className="px-6 py-4 border-t flex justify-between items-center relative z-10" style={{ borderColor: siteSettings.ticketBorderColor || '#333333', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <div>
                {siteSettings.ticketShowPrice !== false && (
                  <>
                    <p className="text-xl font-bold font-mono" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>₹{((ticket.event?.price || 0) / 100).toLocaleString()}</p>
                    <p className="text-xs opacity-70" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>Paid</p>
                  </>
                )}
                {siteSettings.ticketFooterText && (
                  <p className="text-xs opacity-60 mt-1" style={{ color: siteSettings.ticketTextColor || '#ffffff' }}>{siteSettings.ticketFooterText}</p>
                )}
              </div>
              {siteSettings.ticketShowStatus !== false && (
                <span className="px-3 py-1 rounded-full text-xs font-bold border"
                  style={{
                    backgroundColor: ticket.checkedIn ? 'rgba(22, 101, 52, 0.2)' : 'rgba(21, 128, 61, 0.2)',
                    color: ticket.checkedIn ? '#4ade80' : '#4ade80',
                    borderColor: '#4ade80'
                  }}>
                  {ticket.checkedIn ? 'CHECKED IN' : 'VALID'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {/* Primary Actions Row */}
          <div className="flex gap-3">
            <button onClick={downloadTicket} disabled={downloading} className="flex-1 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {downloading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Downloading...</>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download PDF</>
              )}
            </button>

            {/* Add to Calendar Dropdown */}
            <div className="relative group">
              <button className="h-full px-6 border border-gray-700 text-white rounded-xl hover:bg-gray-900 font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Calendar</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute bottom-full mb-2 right-0 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={handleAddToCalendar}
                  className="w-full px-4 py-3 text-left text-white hover:bg-zinc-800 rounded-t-xl flex items-center gap-3 text-sm"
                >
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .ics file
                </button>
                <a
                  href={getGoogleCalendarLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-3 text-left text-white hover:bg-zinc-800 rounded-b-xl flex items-center gap-3 text-sm border-t border-zinc-800"
                >
                  <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path fill="white" d="M8 7.5h8v1.5H8zm0 3h8v1.5H8zm0 3h5v1.5H8z" />
                  </svg>
                  Open in Google Calendar
                </a>
              </div>
            </div>
          </div>

          {/* Secondary Actions Row */}
          <div className="flex gap-3">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex-1 py-3 border border-gray-700 text-white rounded-xl hover:bg-gray-900 font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Ticket
            </button>

            <a href="/" className="flex-1 py-3 border border-gray-700 text-white rounded-xl hover:bg-gray-900 font-medium text-center flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
