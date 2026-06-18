'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScanFeedback } from '@/hooks/useScanFeedback';
import QRScanner from '@/components/QRScanner';
import OfflineBanner from '@/components/OfflineBanner';
import OfflineSyncPill from '@/components/OfflineSyncPill';
import { syncTicketsForEvent, offlineCheckIn, processBackgroundSync, getOfflineTicket } from '@/lib/offline-sync'; // Ensure getOfflineTicket is exported
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Loader2, User, Ticket as TicketIcon, Search, CalendarDays } from 'lucide-react';
import { ParsedScanPayload, parseScanPayload } from '@/lib/scan-payload';

interface Event {
    id: string;
    name: string;
    date: string;
}

export default function ScannerPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [eventSearch, setEventSearch] = useState('');
    const [todayOnly, setTodayOnly] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [mode, setMode] = useState<'scan' | 'verify'>('scan');
    const [deviceName, setDeviceName] = useState('');
    const triggerFeedback = useScanFeedback();

    // Trigger haptic + audio feedback whenever a new scan result is rendered.
    useEffect(() => {
        if (!scanResult) return;
        if (scanResult.success) {
            triggerFeedback('success');
        } else if (typeof scanResult.message === 'string' && /already|duplicate/i.test(scanResult.message)) {
            triggerFeedback('duplicate');
        } else {
            triggerFeedback('error');
        }
    }, [scanResult, triggerFeedback]);

    const todayEvents = useMemo(() => {
        const todayKey = new Date().toDateString();
        return events.filter(event => new Date(event.date).toDateString() === todayKey);
    }, [events]);

    const visibleEvents = useMemo(() => {
        const query = eventSearch.trim().toLowerCase();
        return events.filter(event => {
            const matchesToday = !todayOnly || todayEvents.some(todayEvent => todayEvent.id === event.id);
            const matchesSearch = !query || event.name.toLowerCase().includes(query);
            return matchesToday && matchesSearch;
        });
    }, [eventSearch, events, todayEvents, todayOnly]);

    const chooseEvent = (eventId: string) => {
        setSelectedEventId(eventId);
        if (typeof window !== 'undefined') {
            if (eventId) localStorage.setItem('eventhub:last-pwa-scanner-event', eventId);
            else localStorage.removeItem('eventhub:last-pwa-scanner-event');
        }
    };

    // Load events on mount
    useEffect(() => {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));

        setDeviceName(localStorage.getItem('eventhub:scanner-device-name') || '');

        fetch('/api/events')
            .then(res => res.json())
            .then(data => {
                setEvents(data);
                const savedEventId = localStorage.getItem('eventhub:last-pwa-scanner-event');
                if (savedEventId && Array.isArray(data) && data.some((event: Event) => event.id === savedEventId)) {
                    setSelectedEventId(savedEventId);
                }
            })
            .catch(console.error);

        // Setup background sync interval
        const interval = setInterval(() => {
            if (navigator.onLine) {
                processBackgroundSync().catch(console.error);
            }
        }, 30000); // 30s

        return () => clearInterval(interval);
    }, []);

    const handleSync = async () => {
        if (!selectedEventId || !isOnline) return;
        setIsSyncing(true);
        try {
            const result = await syncTicketsForEvent(selectedEventId);
            if (!result.success) {
                throw new Error(result.error instanceof Error ? result.error.message : 'Failed to fetch tickets');
            }
            await processBackgroundSync();
            setLastSyncTime(new Date());
            // Show toast or temporary success message?
            setScanResult({ success: true, message: 'Sync complete! You can now scan offline.' });
            setTimeout(() => setScanResult(null), 3000);
        } catch (error) {
            console.error(error);
            setScanResult({ success: false, message: 'Sync failed. check implementation.' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleScan = async (data: string) => {
        // Debounce handled by QRScanner component
        setScanResult(null);

        const parsed = parseScanPayload(data);
        if (!parsed) {
            setScanResult({ success: false, message: 'Invalid QR code format.' });
            return;
        }

        try {
            if (isOnline) {
                if (mode === 'verify') {
                    await verifyTicket(parsed);
                    return;
                }

                const res = await fetch('/api/checkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ticketId: parsed.ticketId,
                        token: parsed.token,
                        timedToken: parsed.timedToken,
                        deviceName: deviceName || undefined,
                    })
                });

                if (res.ok) {
                    const result = await res.json();
                    if (result.success || result.checkedIn) {
                        setScanResult({
                            success: true,
                            message: 'Check-in Successful',
                            data: result.ticket
                        });
                        return;
                    } else {
                        setScanResult({
                            success: false,
                            message: result.message || result.error || 'Check-in failed'
                        });
                        return;
                    }
                } else {
                    const result = await res.json().catch(() => ({}));
                    setScanResult({
                        success: false,
                        message: result.message || result.error || 'Check-in failed'
                    });
                    return;
                }
            }

            // Fallback to offline logic
            // First find the ticket locally
            if (!parsed.token) {
                setScanResult({ success: false, message: 'Ticket token missing. Sync or use a static ticket QR.' });
                return;
            }

            const localTicket = await getOfflineTicket(parsed.token);
            if (!localTicket) {
                setScanResult({ success: false, message: 'Ticket not found locally. Please Sync.' });
                return;
            }

            if (localTicket.eventId !== selectedEventId) {
                setScanResult({ success: false, message: 'Ticket belongs to different event.' });
                return;
            }

            if (mode === 'verify') {
                setScanResult({
                    success: true,
                    message: 'Valid Ticket (Mode: Verify)',
                    data: localTicket
                });
                return;
            }

            // Perform offline check-in
            await offlineCheckIn(localTicket.id, selectedEventId);
            setScanResult({
                success: true,
                message: 'Offline Check-in Saved',
                data: localTicket
            });

        } catch (error: any) {
            console.error('Scan error:', error);
            setScanResult({ success: false, message: error.message || 'Scan error' });
        }
    };

    const verifyTicket = async (parsed: ParsedScanPayload) => {
        const tokenQuery = parsed.token ? `?token=${encodeURIComponent(parsed.token)}` : '';
        const res = await fetch(`/api/tickets/${encodeURIComponent(parsed.ticketId)}${tokenQuery}`);
        const result = await res.json().catch(() => ({}));
        const ticket = result.ticket;

        if (!res.ok || !ticket) {
            setScanResult({ success: false, message: result.error || 'Ticket not found' });
            return;
        }

        if (ticket.eventId !== selectedEventId) {
            setScanResult({ success: false, message: 'Ticket belongs to different event.' });
            return;
        }

        if (parsed.token && ticket.token && parsed.token !== ticket.token) {
            setScanResult({ success: false, message: 'Invalid ticket token.' });
            return;
        }

        if (!['paid', 'partially_refunded'].includes(ticket.status)) {
            setScanResult({ success: false, message: `Ticket payment is ${ticket.status}` });
            return;
        }

        setScanResult({
            success: true,
            message: ticket.checkedIn ? 'Valid Ticket - Already Checked In' : 'Valid Ticket',
            data: ticket
        });
    };

    if (!selectedEventId) {
        return (
            <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold mb-8">Select Event</h1>
                <div className="w-full max-w-md space-y-4">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                value={eventSearch}
                                onChange={(event) => setEventSearch(event.target.value)}
                                placeholder="Search assigned events..."
                                className="w-full pl-10 pr-3 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-red-500"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setTodayOnly(value => !value)}
                            className={`px-3 py-3 rounded-lg border text-sm flex items-center gap-1 ${todayOnly ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}
                        >
                            <CalendarDays className="w-4 h-4" />
                            Today
                        </button>
                    </div>
                    <input
                        value={deviceName}
                        onChange={(event) => {
                            setDeviceName(event.target.value);
                            localStorage.setItem('eventhub:scanner-device-name', event.target.value);
                        }}
                        placeholder="Scanner device/session name"
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-red-500"
                    />
                    {visibleEvents.map(event => (
                        <button
                            key={event.id}
                            onClick={() => chooseEvent(event.id)}
                            className="w-full p-4 bg-zinc-900 rounded-lg text-left hover:bg-zinc-800 transition border border-zinc-800"
                        >
                            <div className="font-medium text-lg text-white">{event.name}</div>
                            <div className="text-zinc-500 text-sm">{new Date(event.date).toLocaleDateString()}</div>
                        </button>
                    ))}
                    {events.length === 0 && (
                        <div className="text-zinc-500 text-center">No assigned events are available for scanning.</div>
                    )}
                    {events.length > 0 && visibleEvents.length === 0 && (
                        <div className="text-zinc-500 text-center">No assigned events match the current search/filter.</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center z-10">
                <button
                    onClick={() => chooseEvent('')}
                    className="text-zinc-400 text-sm hover:text-white"
                >
                    change event
                </button>
                <div className="flex items-center gap-3">
                    {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                    <OfflineSyncPill />
                    <button
                        onClick={handleSync}
                        disabled={isSyncing || !isOnline}
                        className={`p-2 rounded-full ${isSyncing ? 'animate-spin bg-blue-600' : 'bg-zinc-800'}`}
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                    {lastSyncTime && <span className="text-xs text-zinc-500">{lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 relative bg-black">
                <QRScanner
                    onScan={handleScan}
                    scanCooldown={2500}
                    continuousMode={false} // pause on success to show result overlay
                />

                {/* Result Overlay */}
                {scanResult && (
                    <div
                        className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 backdrop-blur-sm bg-black/80 animate-in fade-in zoom-in duration-200`}
                        onClick={() => setScanResult(null)} // Click to dismiss
                    >
                        {scanResult.success ? (
                            <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
                        ) : (
                            <XCircle className="w-24 h-24 text-red-500 mb-4" />
                        )}

                        <h2 className={`text-3xl font-bold mb-2 ${scanResult.success ? 'text-green-500' : 'text-red-500'}`}>
                            {scanResult.message}
                        </h2>

                        {scanResult.data && (
                            <div className="mt-4 p-4 bg-zinc-900 rounded-lg w-full max-w-sm border border-zinc-800">
                                <div className="flex items-center gap-3 mb-2 justify-center">
                                    <User className="w-5 h-5 text-zinc-400" />
                                    <span className="text-xl font-medium">{scanResult.data.name || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center gap-3 justify-center text-zinc-500">
                                    <TicketIcon className="w-4 h-4" />
                                    <span className="font-mono text-sm">{scanResult.data.token || scanResult.data.id?.slice(-6) || '...'}</span>
                                </div>
                                {scanResult.data.checkedInAt && (
                                    <div className="mt-2 text-xs text-yellow-500">
                                        Checked In: {new Date(scanResult.data.checkedInAt).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-8 text-zinc-500 text-sm">
                            Tap anywhere to continue scanning
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Mode Toggle */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-center pb-8 safe-area-pb">
                <div className="flex bg-zinc-950 p-1 rounded-full border border-zinc-800">
                    <button
                        onClick={() => setMode('scan')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'scan' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'
                            }`}
                    >
                        Check-In
                    </button>
                    <button
                        onClick={() => setMode('verify')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'verify' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'
                            }`}
                    >
                        Verify Only
                    </button>
                </div>
            </div>

            {/* Offline sync banner */}
            <OfflineBanner />
        </div>
    );
}
