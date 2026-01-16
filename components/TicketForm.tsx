'use client';

import { useApp } from '@/lib/store';
import { useState, useEffect } from 'react';
import { useToast } from './Toaster';

interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  venue: string | null;
  price: number;
  // Early Bird Pricing
  earlyBirdEnabled?: boolean;
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;
  // Dynamic Pricing
  currentPrice?: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function TicketForm() {
  const { siteSettings } = useApp();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState<{ name: string; email: string; phone: string }[]>([{ name: '', email: '', phone: '' }]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const { showToast } = useToast();

  const MAX_TICKETS = 10;

  // Update attendees array when quantity changes
  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, Math.min(MAX_TICKETS, newQty));
    setQuantity(qty);

    const newAttendees = [...attendees];
    while (newAttendees.length < qty) {
      newAttendees.push({ name: '', email: '', phone: '' });
    }
    while (newAttendees.length > qty) {
      newAttendees.pop();
    }
    setAttendees(newAttendees);
  };

  // Update single attendee
  const updateAttendee = (index: number, field: 'name' | 'email' | 'phone', value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);

    // Keep formData in sync with first attendee for payment prefill
    if (index === 0) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    if (!selectedEventData) return 0;

    // Check Early Bird first (override dynamic)
    if (selectedEventData.earlyBirdEnabled &&
      selectedEventData.earlyBirdDeadline &&
      new Date(selectedEventData.earlyBirdDeadline) > new Date()) {
      return (selectedEventData.earlyBirdPrice || selectedEventData.price) * quantity;
    }

    // Use Dynamic Price if available, else Base Price
    const pricePerTicket = selectedEventData.currentPrice !== undefined
      ? selectedEventData.currentPrice
      : selectedEventData.price;

    return pricePerTicket * quantity;
  };

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    // Fetch events
    fetchEvents();

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        let fetchedEvents: Event[] = [];

        if (Array.isArray(data)) {
          fetchedEvents = data;
        } else if (data.events) {
          fetchedEvents = data.events;
        }

        setEvents(fetchedEvents);

        // Auto-select event logic
        if (fetchedEvents.length > 0) {
          const preSelected = localStorage.getItem('selectedEventId');
          if (preSelected) {
            const exists = fetchedEvents.find((e) => e.id === preSelected);
            if (exists) {
              setSelectedEvent(preSelected);
              localStorage.removeItem('selectedEventId');
            } else {
              setSelectedEvent(fetchedEvents[0].id);
            }
          } else {
            setSelectedEvent(fetchedEvents[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load events', error);
      showToast('Failed to load events', 'error');
    } finally {
      setLoadingEvents(false);
    }
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) {
      showToast('Please select an event', 'error');
      return;
    }

    // Validate all attendee names are filled
    const invalidAttendee = attendees.find((a, i) => !a.name.trim());
    if (invalidAttendee !== undefined) {
      showToast('Please enter names for all ticket holders', 'error');
      return;
    }

    setLoading(true);

    try {
      const selectedEvt = events.find(e => e.id === selectedEvent);
      if (!selectedEvt) throw new Error('Event not found');

      const totalAmount = calculateTotalPrice();

      // Create tickets for all attendees
      const ticketRes = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent,
          quantity,
          attendees: attendees.map(a => ({
            name: a.name,
            email: a.email || formData.email,
            phone: a.phone || formData.phone,
          })),
          name: attendees[0].name,
          email: attendees[0].email || formData.email,
          phone: attendees[0].phone || formData.phone,
        }),
      });


      if (!ticketRes.ok) {
        const errorText = await ticketRes.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Failed to create ticket');
        } catch (e) {
          throw new Error(errorText || 'Failed to create ticket');
        }
      }

      const ticketData = await ticketRes.json();

      // Create Razorpay order with total amount
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketData.ticketId, // Primary ticket ID
          ticketIds: ticketData.ticketIds, // All ticket IDs for multi-ticket
          amount: totalAmount,
          quantity,
        }),
      });

      if (!orderRes.ok) {
        const errorText = await orderRes.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Failed to create payment order');
        } catch (e) {
          throw new Error(errorText || 'Failed to create payment order');
        }
      }

      const orderData = await orderRes.json();

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Event Ticketing',
        description: ticketData.eventName,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // Verify payment
          const selectedEvt = events.find(e => e.id === selectedEvent);
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ticketId: ticketData.ticketId,
              email: formData.email,
              name: formData.name,
              eventName: selectedEvt?.name || ticketData.eventName,
              eventDate: selectedEvt?.date,
              venue: selectedEvt?.venue,
              // Pass custom styles setting
              emailStyles: {
                bgColor: siteSettings?.ticketBgColor,
                textColor: siteSettings?.ticketTextColor,
                accentColor: siteSettings?.ticketAccentColor,
                gradientColor: siteSettings?.ticketGradientColor,
                fontFamily: siteSettings?.ticketFontFamily,
                borderRadius: siteSettings?.ticketBorderRadius,
                logoUrl: siteSettings?.ticketLogoUrl
              }
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            showToast('Payment successful! Check your email for ticket.', 'success');
            // Redirect to ticket page
            window.location.href = `/ticket/${ticketData.ticketId}?success=true`;
          } else {
            showToast(verifyData.error || 'Payment verification failed', 'error');
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#dc2626',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error('Ticket purchase error:', err);
      // Check for fetch/network errors
      if (err.message && (err.message.includes('fetch') || err.message.includes('Network'))) {
        showToast('Connection to server failed. Please try again.', 'error');
      } else {
        showToast(err.message || 'An error occurred', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl shadow-2xl overflow-hidden border border-zinc-800/50">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-red-600/80 to-red-900/80 px-8 py-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white">Event Registration</h2>
          <p className="text-red-200 text-sm mt-1">Select your event and complete registration</p>
        </div>

        {/* Card Body */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Select Event <span className="text-red-500">*</span>
              </label>
              {loadingEvents ? (
                <div className="h-12 bg-zinc-800 rounded-xl animate-pulse" />
              ) : events.length === 0 ? (
                <div className="p-4 bg-zinc-800 rounded-xl text-zinc-400 text-center">
                  No events available at the moment
                </div>
              ) : (
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white transition-all appearance-none cursor-pointer"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} - ₹{(event.price / 100).toFixed(0)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Event Details */}
            {selectedEventData && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                {/* Early Bird Banner */}
                {selectedEventData.earlyBirdEnabled && selectedEventData.earlyBirdDeadline && new Date(selectedEventData.earlyBirdDeadline) > new Date() && (
                  <div className="mb-3 -mt-1 -mx-1 px-3 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg border border-green-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-green-400 text-xs font-semibold">Early Bird Discount Active!</p>
                        <p className="text-green-500/70 text-xs">
                          Ends {new Date(selectedEventData.earlyBirdDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-bold">
                      Save {Math.round(((selectedEventData.price - (selectedEventData.earlyBirdPrice || 0)) / selectedEventData.price) * 100)}%
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{selectedEventData.name}</h3>
                    {selectedEventData.description && (
                      <p className="text-sm text-zinc-400 mt-1">{selectedEventData.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                      {selectedEventData.venue && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {selectedEventData.venue}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(selectedEventData.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {selectedEventData.earlyBirdEnabled && selectedEventData.earlyBirdDeadline && new Date(selectedEventData.earlyBirdDeadline) > new Date() ? (
                      <>
                        <p className="text-2xl font-bold text-green-400">₹{((selectedEventData.earlyBirdPrice || 0) / 100).toFixed(0)}</p>
                        <p className="text-sm text-zinc-500 line-through">₹{(selectedEventData.price / 100).toFixed(0)}</p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-white">₹{(selectedEventData.price / 100).toFixed(0)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {selectedEventData && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1">
                      Number of Tickets
                    </label>
                    <p className="text-xs text-zinc-500">Max {MAX_TICKETS} tickets per order</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white text-xl font-bold transition-colors"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-2xl font-bold text-white">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= MAX_TICKETS}
                      className="w-10 h-10 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white text-xl font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total Price Display */}
                <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center justify-between">
                  <span className="text-zinc-400">Total Amount:</span>
                  <span className="text-2xl font-bold text-white">₹{(calculateTotalPrice() / 100).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Attendee Details */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-zinc-300">
                Attendee Details {quantity > 1 && <span className="text-zinc-500 font-normal">({quantity} tickets)</span>}
              </label>

              {attendees.map((attendee, index) => (
                <div key={index} className={`p-4 rounded-xl border ${index === 0 ? 'bg-zinc-800/70 border-red-900/50' : 'bg-zinc-800/30 border-zinc-700'}`}>
                  {quantity > 1 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {index === 0 ? 'Primary Ticket Holder' : `Ticket ${index + 1}`}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <input
                      type="text"
                      required
                      value={attendee.name}
                      onChange={(e) => updateAttendee(index, 'name', e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-zinc-500 transition-all"
                      placeholder={`Full Name ${index === 0 ? '(Required)' : ''}`}
                    />

                    {index === 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="email"
                          value={attendee.email}
                          onChange={(e) => updateAttendee(index, 'email', e.target.value)}
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-zinc-500 transition-all"
                          placeholder="Email Address"
                        />
                        <input
                          type="tel"
                          value={attendee.phone}
                          onChange={(e) => updateAttendee(index, 'phone', e.target.value)}
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-zinc-500 transition-all"
                          placeholder="Phone Number"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !selectedEvent}
              className={`w-full py-4 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:from-zinc-600 disabled:to-zinc-600 disabled:cursor-not-allowed font-semibold transition-all shadow-lg text-lg ${selectedEventData?.earlyBirdEnabled && selectedEventData?.earlyBirdDeadline && new Date(selectedEventData.earlyBirdDeadline) > new Date()
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-green-900/30'
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 hover:shadow-red-900/30'
                } text-white`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : selectedEventData?.earlyBirdEnabled && selectedEventData?.earlyBirdDeadline && new Date(selectedEventData.earlyBirdDeadline) > new Date() ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Early Bird - ₹{(calculateTotalPrice() / 100).toLocaleString()}{quantity > 1 ? ` (${quantity} tickets)` : ''}
                </span>
              ) : (
                `Purchase ${quantity > 1 ? `${quantity} Tickets` : 'Ticket'}${selectedEventData ? ` - ₹${(calculateTotalPrice() / 100).toLocaleString()}` : ''}`
              )}
            </button>
          </form>
        </div>

        {/* Card Footer */}
        <div className="bg-zinc-800/50 px-8 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}
