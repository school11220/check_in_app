'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { useToast } from '@/components/Toaster';
import QRScanner from '@/components/QRScanner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOfflineCheckin } from '@/hooks/useOfflineCheckin';
import {
  ScanLine, LogOut, Ticket, Lock, CheckCircle, XCircle, Radio, Calendar, X,
  History, Users, BarChart3, Home, Download, WifiOff, Wifi, RefreshCw,
  FileSpreadsheet, Shield, Clock, TrendingUp, AlertTriangle
} from 'lucide-react';
import SessionScheduler from '@/components/admin/SessionScheduler';
import { useClerk, useUser } from '@clerk/nextjs';

function CheckinPageContent() {
  const { events } = useApp();
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const { signOut } = useClerk();
  const { user } = useUser();

  // Role verification on client side
  const userRole = (user?.publicMetadata?.role as string) || '';
  const allowedRoles = ['ADMIN', 'ORGANIZER', 'ORGANISER', 'SCANNER'];
  const isAllowed = allowedRoles.includes(userRole);
  const canExport = ['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(userRole);

  const [showSchedule, setShowSchedule] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history' | 'guestlist' | 'stats'>('scanner');

  // Guest list state
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [guestListLoading, setGuestListLoading] = useState(false);

  // Stats state
  const [stats, setStats] = useState<any>({
    total: 0, checkedIn: 0, pending: 0, checkInRate: '0',
    hourlyBreakdown: [], recentCheckins: [],
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // History state
  const [checkinHistory, setCheckinHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scanner state
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Offline support
  const { isOnline, pendingSync, isSyncing, addOfflineCheckin, syncPending } = useOfflineCheckin();

  // Auto-refresh interval for stats
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch data when tab changes
  useEffect(() => {
    if (eventId) {
      if (activeTab === 'guestlist') fetchTickets();
      if (activeTab === 'stats') fetchStats();
      if (activeTab === 'history') fetchHistory();
    }
  }, [activeTab, eventId]);

  // Auto-refresh stats every 10s when on stats tab
  useEffect(() => {
    if (activeTab === 'stats' && eventId && autoRefresh) {
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, eventId, autoRefresh]);

  const fetchTickets = async () => {
    setGuestListLoading(true);
    try {
      const res = await fetch(`/api/tickets?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.filter((t: any) => t.status === 'paid'));
      }
    } catch (e) {
      console.error('Failed to fetch tickets:', e);
      showToast('Failed to load guest list', 'error');
    } finally {
      setGuestListLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!eventId) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/checkin?eventId=${eventId}&type=stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!eventId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/checkin?eventId=${eventId}&type=history`);
      if (res.ok) {
        const data = await res.json();
        setCheckinHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const manualCheckIn = async (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && ticket.token) {
      handleScan(`${ticket.id}:${ticket.token}`);
    } else {
      handleScan(`${ticketId}:`);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirectUrl: '/login' });
  };

  const handleScan = async (code: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let ticketId: string | undefined, token: string | undefined, timedToken: string | undefined;

      try {
        if (code.startsWith('http')) {
          const url = new URL(code);
          const pathParts = url.pathname.split('/');
          ticketId = pathParts[pathParts.length - 1];
          token = url.searchParams.get('token') || '';
        } else {
          const data = JSON.parse(code);
          ticketId = data.ticketId;
          token = data.token;
          timedToken = data.timedToken; // Enhanced timed QR support
        }
      } catch {
        [ticketId, token] = code.split(':');
      }

      if (!ticketId) {
        setScanResult({ success: false, message: 'Invalid QR code format' });
        showToast('Invalid QR code format', 'error');
        return;
      }

      // Offline mode: queue locally
      if (!isOnline) {
        try {
          addOfflineCheckin(ticketId, token || '');
          setScanResult({
            success: true,
            message: 'Checked in offline - will sync when online',
            details: { name: 'Offline Check-in', ticketId, event: 'Queued' },
          });
          setRecentCheckins(prev => [{
            id: ticketId,
            name: 'Offline Check-in',
            event: 'Pending sync',
            time: new Date().toLocaleTimeString(),
            offline: true,
          }, ...prev.slice(0, 4)]);
          showToast('Offline check-in queued', 'success');
        } catch (err: any) {
          setScanResult({ success: false, message: err.message || 'Failed to queue offline check-in' });
          showToast(err.message || 'Failed to queue', 'error');
        }
        return;
      }

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, token, timedToken }),
      });

      const result = await response.json();

      if (result.success) {
        const event = events.find(e => e.id === result.ticket?.eventId);
        setScanResult({
          success: true,
          message: result.message || 'Check-in successful!',
          details: {
            name: result.ticket?.name,
            email: result.ticket?.email,
            event: result.ticket?.event?.name || event?.name || 'Event',
            ticketId: result.ticket?.id,
          }
        });

        setRecentCheckins(prev => [{
          id: result.ticket?.id,
          name: result.ticket?.name,
          event: result.ticket?.event?.name || 'Event',
          time: new Date().toLocaleTimeString()
        }, ...prev.slice(0, 4)]);

        showToast(`Welcome, ${result.ticket?.name}!`, 'success');
      } else {
        setScanResult({ success: false, message: result.message || 'Check-in failed' });
        showToast(result.message || 'Check-in failed', 'error');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to verify ticket';
      setScanResult({ success: false, message: errorMsg });
      showToast(errorMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx', type: 'tickets' | 'checkins') => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/export?eventId=${eventId}&format=${format}&type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-${eventId}.${format === 'xlsx' ? 'xls' : format}`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`${type} exported as ${format.toUpperCase()}`, 'success');
      } else {
        showToast('Export failed', 'error');
      }
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleExportAuditLog = async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/checkin/audit/export?eventId=${eventId}&format=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${eventId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Audit log exported', 'success');
      }
    } catch {
      showToast('Export failed', 'error');
    }
  };

  // Access denied screen
  if (!isAllowed && user) {
    return (
      <main className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#141414] border border-[#E11D2E]/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#E11D2E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#E11D2E]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-[#737373] mb-6">
            You don&apos;t have permission to access the check-in scanner.
            Only Admin, Organizer, and Scanner roles can access this page.
          </p>
          <p className="text-xs text-[#737373] mb-6">Current role: <span className="text-[#E11D2E] font-mono">{userRole || 'UNAUTHORIZED'}</span></p>
          <div className="flex gap-3">
            <a href="/" className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#2A2A2A] text-center text-sm font-medium">Home</a>
            <button onClick={handleLogout} className="flex-1 py-3 bg-[#E11D2E] text-white rounded-xl hover:bg-[#B91C1C] text-sm font-medium">Sign Out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0B0B] py-6 px-4 pb-20">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,46,0.08),transparent_60%)]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 glass p-4 md:p-5 rounded-2xl sticky top-2 z-40 backdrop-blur-xl bg-[#0B0B0B]/80 border border-white/5">
          <div className="flex items-center gap-3 md:gap-4">
            <img src="/logo.png" alt="EventHub" className="w-10 h-10 md:w-14 md:h-14 rounded-xl shadow-lg shadow-red-900/30" />
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">EventHub Check-In</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[#737373] text-xs md:text-sm">Ready to scan tickets</p>
                {/* Online/Offline indicator */}
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${isOnline ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                  {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {pendingSync.length > 0 && (
                  <button
                    onClick={() => syncPending()}
                    disabled={isSyncing || !isOnline}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {pendingSync.length} pending
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 self-start md:self-auto overflow-x-auto max-w-full pb-1 md:pb-0">
            <a href="/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 md:px-5 md:py-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-[#B3B3B3] hover:text-white text-xs md:text-sm flex items-center transition-colors border border-[#1F1F1F] hover:border-[#2A2A2A] whitespace-nowrap">
              <Home className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Home
            </a>
            {eventId && (
              <button
                onClick={() => setShowSchedule(true)}
                className="px-3 py-2 md:px-5 md:py-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-[#B3B3B3] hover:text-white text-xs md:text-sm flex items-center transition-colors border border-[#1F1F1F] hover:border-[#2A2A2A] whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Schedule
              </button>
            )}
            <a href="/admin" className="px-3 py-2 md:px-5 md:py-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-[#B3B3B3] hover:text-white text-xs md:text-sm flex items-center transition-colors border border-[#1F1F1F] hover:border-[#2A2A2A] whitespace-nowrap">
              <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Admin Panel
            </a>
            <button onClick={handleLogout} className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#E11D2E]/10 text-[#FF6B7A] border border-[#E11D2E]/20 rounded-xl hover:bg-[#E11D2E]/15 text-xs md:text-sm transition-colors">
              <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-24 z-30 mb-6 md:mb-8 bg-[#0B0B0B]/95 backdrop-blur-sm pt-2 -mt-2 pb-2">
          <div className="flex justify-start md:justify-center overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <div className="bg-[#141414] p-1.5 rounded-2xl border border-[#1F1F1F] inline-flex whitespace-nowrap shadow-xl">
              {[
                { id: 'scanner' as const, icon: ScanLine, label: 'Scanner' },
                { id: 'guestlist' as const, icon: Users, label: 'Guest List' },
                { id: 'stats' as const, icon: BarChart3, label: 'Live Stats' },
                { id: 'history' as const, icon: History, label: 'History' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-[#E11D2E] text-white shadow-lg shadow-red-900/20' : 'text-[#737373] hover:text-white hover:bg-white/5'}`}
                >
                  <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Tab */}
          {activeTab === 'scanner' && (
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in items-start">
              <div className="lg:col-span-7 xl:col-span-8 bg-[#0D0D0D] border border-[#1F1F1F] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-5 border-b border-[#1F1F1F] flex justify-between items-center bg-[#141414]">
                  <h2 className="font-heading text-lg font-semibold text-white flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D2E] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E11D2E]"></span>
                    </span>
                    Live Scanner
                  </h2>
                  <div className="flex items-center gap-2">
                    {!isOnline && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20 flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Offline Mode
                      </span>
                    )}
                    <span className="text-xs text-[#737373] font-mono bg-[#0D0D0D] px-3 py-1.5 rounded-lg border border-[#1F1F1F]">
                      {isProcessing ? 'Processing...' : 'Camera Active'}
                    </span>
                  </div>
                </div>

                <div className="relative aspect-square bg-black group overflow-hidden flex items-center justify-center">
                  <QRScanner onScan={handleScan} />
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                    <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#E11D2E] rounded-tl-2xl -mt-1 -ml-1 animate-pulse-slow"></div>
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#E11D2E] rounded-tr-2xl -mt-1 -mr-1 animate-pulse-slow animation-delay-100"></div>
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#E11D2E] rounded-bl-2xl -mb-1 -ml-1 animate-pulse-slow animation-delay-200"></div>
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#E11D2E] rounded-br-2xl -mb-1 -mr-1 animate-pulse-slow animation-delay-300"></div>
                      {scanResult?.success && (
                        <div className="absolute inset-0 bg-[#22C55E]/20 animate-pulse rounded-3xl"></div>
                      )}
                      <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#E11D2E] to-transparent shadow-[0_0_20px_rgba(225,29,46,0.8)] animate-scan-line"></div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-[#0D0D0D] border-t border-[#1F1F1F] space-y-5">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#141414] border border-[#1F1F1F]">
                    <div className="p-1.5 bg-[#E11D2E]/10 rounded-full text-[#E11D2E] flex-shrink-0 mt-0.5">
                      <Radio className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-[#B3B3B3] leading-relaxed">
                      Position the <span className="text-white font-medium">QR code</span> within the red frame. 
                      {!isOnline && <span className="text-yellow-400 ml-1">(Offline mode: check-ins will sync when back online)</span>}
                    </p>
                  </div>

                  <form onSubmit={handleManualSubmit} className="relative">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Enter ticket code manually"
                      className="w-full pl-5 pr-28 py-4 bg-[#141414] border border-[#1F1F1F] rounded-xl text-white text-sm focus:outline-none focus:border-[#E11D2E]/50 focus:ring-2 focus:ring-[#E11D2E]/20 transition-all placeholder:text-[#737373]"
                    />
                    <button
                      type="submit"
                      disabled={!manualCode.trim() || isProcessing}
                      className="absolute right-2 top-2 bottom-2 px-5 bg-gradient-to-r from-[#E11D2E] to-[#B91C1C] hover:from-[#FF2D3F] hover:to-[#E11D2E] text-white rounded-lg transition-all text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? '...' : 'Verify'}
                    </button>
                  </form>
                </div>

                {scanResult && !scanResult.success && (
                  <div className="p-3 text-[10px] text-[#737373] font-mono bg-black/50 overflow-hidden break-all border-t border-[#1F1F1F]">
                    Last error: {scanResult.message}
                  </div>
                )}
              </div>

              {/* Result & Recent - Side Panel */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-6 flex flex-col h-full">
                {scanResult && (
                  <div className={`p-6 rounded-2xl backdrop-blur-md border animate-scale-in ${scanResult.success
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/30 shadow-[0_0_40px_rgba(34,197,94,0.1)]'
                    : 'bg-[#E11D2E]/10 border-[#E11D2E]/30 shadow-[0_0_40px_rgba(225,29,46,0.1)]'
                    }`}>
                    <div className="flex items-start gap-4 mb-5">
                      <div className={`p-4 rounded-full ${scanResult.success ? 'bg-[#22C55E]/20' : 'bg-[#E11D2E]/20'}`}>
                        {scanResult.success ? (
                          <CheckCircle className="w-8 h-8 text-[#22C55E]" />
                        ) : (
                          <XCircle className="w-8 h-8 text-[#E11D2E]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-heading text-xl font-bold ${scanResult.success ? 'text-[#22C55E]' : 'text-[#E11D2E]'}`}>
                          {scanResult.success ? 'Access Granted' : 'Access Denied'}
                        </h3>
                        <p className="text-[#B3B3B3] text-sm mt-1">{scanResult.message}</p>
                      </div>
                    </div>

                    {scanResult.details && (
                      <div className="space-y-3 bg-black/20 rounded-xl p-5 border border-white/5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-[#737373] text-sm">Guest</span>
                          <span className="text-white font-semibold">{scanResult.details.name}</span>
                        </div>
                        {scanResult.details.email && (
                          <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <span className="text-[#737373] text-sm">Email</span>
                            <span className="text-white text-sm max-w-[150px] truncate">{scanResult.details.email}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-[#737373] text-sm">Event</span>
                          <span className="text-[#FF6B7A] font-medium text-sm max-w-[150px] truncate">{scanResult.details.event}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="glass rounded-2xl p-6 flex-1 min-h-[300px] border border-[#1F1F1F]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-heading text-lg font-semibold text-white">Recent Activity</h3>
                    <div className="flex items-center gap-2 text-xs text-[#22C55E] bg-[#22C55E]/10 px-3 py-1.5 rounded-full border border-[#22C55E]/20">
                      <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse"></span>
                      Live
                    </div>
                  </div>

                  {recentCheckins.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-[#737373]">
                      <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#1F1F1F] flex items-center justify-center mb-4">
                        <ScanLine className="w-6 h-6 text-[#737373] opacity-50" />
                      </div>
                      <p className="text-sm font-medium">Waiting for scans...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentCheckins.slice(0, 5).map((checkin, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border text-white font-bold text-sm ${checkin.offline ? 'bg-yellow-500/20 border-yellow-500/20' : 'bg-[#E11D2E]/20 border-[#E11D2E]/20'}`}>
                              {checkin.offline ? <WifiOff className="w-4 h-4 text-yellow-400" /> : checkin.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">{checkin.name}</p>
                              <p className="text-[#737373] text-xs max-w-[120px] truncate">{checkin.event}</p>
                            </div>
                          </div>
                          <span className="text-xs text-[#737373] font-mono">{checkin.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Guest List Tab */}
          {activeTab === 'guestlist' && (
            <div className="lg:col-span-2 glass rounded-2xl p-6 min-h-[500px] animate-fade-in space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#E11D2E]" />
                  Guest List
                  <span className="text-sm font-normal text-[#737373]">({tickets.length} attendees)</span>
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search guests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:border-[#E11D2E] outline-none w-full md:w-64"
                  />
                  {canExport && eventId && (
                    <div className="relative group">
                      <button className="px-3 py-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-[#737373] hover:text-white hover:border-[#2A2A2A] transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-48 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <button onClick={() => handleExport('csv', 'tickets')} className="w-full px-4 py-2.5 text-left text-white hover:bg-[#2A2A2A] rounded-t-xl text-sm flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4" /> Export CSV
                        </button>
                        <button onClick={() => handleExport('xlsx', 'tickets')} className="w-full px-4 py-2.5 text-left text-white hover:bg-[#2A2A2A] rounded-b-xl text-sm flex items-center gap-2 border-t border-[#1F1F1F]">
                          <FileSpreadsheet className="w-4 h-4" /> Export Excel
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={fetchTickets} className="px-3 py-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-[#737373] hover:text-white transition-colors">
                    <RefreshCw className={`w-4 h-4 ${guestListLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {guestListLoading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-[#E11D2E] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {tickets
                    .filter(t =>
                      (t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map(ticket => (
                      <div key={ticket.id} className="flex items-center justify-between p-4 bg-[#141414] border border-[#1F1F1F] rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${ticket.checkedIn ? 'bg-green-500/20 text-green-500' : 'bg-[#2A2A2A] text-[#737373]'}`}>
                            {ticket.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{ticket.name}</p>
                            <p className="text-[#737373] text-xs">{ticket.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ticket.checkedIn ? (
                            <span className="text-green-500 text-sm font-medium flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4" />
                              Checked In
                            </span>
                          ) : (
                            <button
                              onClick={() => manualCheckIn(ticket.id)}
                              className="px-4 py-1.5 bg-[#E11D2E]/10 text-[#E11D2E] hover:bg-[#E11D2E] hover:text-white border border-[#E11D2E]/30 rounded-lg text-sm font-medium transition-all"
                            >
                              Check In
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  {tickets.length === 0 && !guestListLoading && (
                    <div className="text-center py-10 text-[#737373]">
                      {eventId ? 'No attendees found for this event.' : 'Select an event to see the guest list.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Stats Tab */}
          {activeTab === 'stats' && (
            <div className="lg:col-span-2 space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#E11D2E]" />
                  Live Statistics
                </h3>
                <div className="flex items-center gap-2">
                  {canExport && eventId && (
                    <button onClick={() => handleExport('csv', 'checkins')} className="px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg text-[#737373] hover:text-white text-xs flex items-center gap-1.5 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  )}
                  <button
                    onClick={fetchStats}
                    className="px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg text-[#737373] hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-[#E11D2E]/20 text-[#E11D2E] rounded-full flex items-center justify-center mb-4">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <h4 className="text-[#737373] text-sm font-medium">Total Tickets</h4>
                  <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
                </div>
                <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-[#737373] text-sm font-medium">Checked In</h4>
                  <p className="text-3xl font-bold text-white mt-2">{stats.checkedIn}</p>
                </div>
                <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-[#737373] text-sm font-medium">Pending</h4>
                  <p className="text-3xl font-bold text-white mt-2">{stats.pending}</p>
                </div>
                <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-full flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h4 className="text-[#737373] text-sm font-medium">Check-in Rate</h4>
                  <p className="text-3xl font-bold text-white mt-2">{stats.checkInRate}%</p>
                </div>
              </div>

              {/* Progress Ring */}
              <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-8 flex flex-col items-center justify-center">
                <h4 className="text-white text-lg font-semibold mb-6">Check-in Progress</h4>
                <div className="relative w-48 h-48 md:w-64 md:h-64">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="#1F1F1F" strokeWidth="12" />
                    <circle
                      cx="50%" cy="50%" r="45%"
                      fill="transparent" stroke="#22C55E" strokeWidth="12"
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                      style={{
                        strokeDasharray: `${(stats.total > 0 ? (stats.checkedIn / stats.total) : 0) * (2 * Math.PI * 45)}% ${2 * Math.PI * 45}%`,
                        strokeDashoffset: 0
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                    </span>
                    <span className="text-[#737373] text-sm">Complete</span>
                  </div>
                </div>
              </div>

              {/* Hourly Breakdown */}
              {stats.hourlyBreakdown && stats.hourlyBreakdown.some((h: any) => h.count > 0) && (
                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                  <h4 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#E11D2E]" /> Hourly Check-ins (Today)
                  </h4>
                  <div className="flex items-end gap-1 h-32">
                    {stats.hourlyBreakdown.map((h: any, i: number) => {
                      const max = Math.max(...stats.hourlyBreakdown.map((x: any) => x.count), 1);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-[#E11D2E]/60 rounded-t transition-all duration-500"
                            style={{ height: `${(h.count / max) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }}
                          />
                          {i % 3 === 0 && (
                            <span className="text-[8px] text-[#737373]">{h.hour}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Check-ins from API */}
              {stats.recentCheckins && stats.recentCheckins.length > 0 && (
                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                  <h4 className="text-white text-lg font-semibold mb-4">Recent Check-ins</h4>
                  <div className="space-y-2">
                    {stats.recentCheckins.slice(0, 10).map((checkin: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#0D0D0D] border border-[#1F1F1F]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold text-sm">
                            {checkin.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{checkin.name}</p>
                            <p className="text-[#737373] text-xs">{checkin.email}</p>
                          </div>
                        </div>
                        <span className="text-xs text-[#737373] font-mono">
                          {checkin.checkedInAt ? new Date(checkin.checkedInAt).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!eventId && (
                <div className="text-center py-10 text-[#737373]">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>Select an event to view live statistics.</p>
                  <p className="text-xs mt-1">Add <code className="bg-[#1A1A1A] px-2 py-0.5 rounded">?event=EVENT_ID</code> to the URL.</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="lg:col-span-2 glass rounded-2xl p-6 min-h-[500px] animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#E11D2E]" />
                  Check-in History
                  <span className="text-sm font-normal text-[#737373]">({checkinHistory.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                  {canExport && eventId && (
                    <>
                      <button onClick={handleExportAuditLog} className="px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg text-[#737373] hover:text-white text-xs flex items-center gap-1.5 transition-colors">
                        <Shield className="w-3.5 h-3.5" /> Audit Log
                      </button>
                      <button onClick={() => handleExport('csv', 'checkins')} className="px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg text-[#737373] hover:text-white text-xs flex items-center gap-1.5 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Export
                      </button>
                    </>
                  )}
                  <button onClick={fetchHistory} className="px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg text-[#737373] hover:text-white text-xs flex items-center gap-1.5 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-[#E11D2E] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : checkinHistory.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-[#737373]">
                  <History className="w-10 h-10 mb-3 opacity-30" />
                  <p>No check-in history available yet.</p>
                  {!eventId && <p className="text-xs mt-1">Select an event to see history.</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {checkinHistory.map((checkin, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">
                          {checkin.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{checkin.name}</p>
                          <p className="text-zinc-500 text-sm">{checkin.email || checkin.eventName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-500 font-mono text-sm block">
                          {checkin.checkedInAt ? new Date(checkin.checkedInAt).toLocaleTimeString() : ''}
                        </span>
                        <span className="text-zinc-600 text-xs">
                          {checkin.checkedInAt ? new Date(checkin.checkedInAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && eventId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#0B0B0B] border border-zinc-800 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <div>
                <h3 className="text-xl font-bold text-white">Event Schedule</h3>
                <p className="text-zinc-500 text-sm">
                  {events.find(e => e.id === eventId)?.name || 'Current Event'}
                </p>
              </div>
              <button
                onClick={() => setShowSchedule(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <SessionScheduler
                eventId={eventId}
                eventDate={events.find(e => e.id === eventId)?.date || new Date().toISOString()}
                showToast={showToast}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading check-in...</div>}>
      <CheckinPageContent />
    </Suspense>
  );
}
