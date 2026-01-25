'use client';

import { useState, useEffect, Suspense } from 'react';
import { useApp } from '@/lib/store';
import { useToast } from '@/components/Toaster';
import QRScanner from '@/components/QRScanner';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScanLine, LogOut, Ticket, Lock, CheckCircle, XCircle, Radio, Calendar, X, History, Grip } from 'lucide-react';
import SessionScheduler from '@/components/admin/SessionScheduler';
import { useClerk } from '@clerk/nextjs';


function CheckinPageContent() {
  const { events } = useApp();
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const { signOut } = useClerk();

  const [showSchedule, setShowSchedule] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history'>('scanner');


  const [password, setPassword] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirectUrl: '/login' });
  };

  const handleScan = async (code: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Parse QR code - could be URL or JSON
      let ticketId, token;

      try {
        // Check if it's a URL (e.g., http://localhost:3000/ticket/abc?token=xyz)
        if (code.startsWith('http')) {
          const url = new URL(code);
          const pathParts = url.pathname.split('/');
          ticketId = pathParts[pathParts.length - 1];
          token = url.searchParams.get('token') || '';
        } else {
          // Try JSON first
          const data = JSON.parse(code);
          ticketId = data.ticketId;
          token = data.token;
        }
      } catch {
        // Fallback to legacy format: ticketId:token
        [ticketId, token] = code.split(':');
      }

      if (!ticketId) {
        setScanResult({ success: false, message: 'Invalid QR code format' });
        showToast('Invalid QR code format', 'error');
        return;
      }

      console.log('Sending check-in request:', { ticketId, token });

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, token }),
      });

      console.log('API Response status:', response.status);
      const result = await response.json();
      console.log('API Result:', result);

      if (result.success) {
        // ... success logic ...
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
        console.warn('Check-in failed:', result);
        setScanResult({ success: false, message: result.message || 'Check-in failed' });
        showToast(result.message || 'Check-in failed', 'error');
      }
    } catch (error) {
      console.error('Check-in critical error:', error);
      let errorMsg = 'Failed to verify ticket';
      if (error instanceof Error) errorMsg += `: ${error.message}`;
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

  return (
    <main className="min-h-screen bg-[#0B0B0B] py-6 px-4 pb-20">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,46,0.08),transparent_60%)]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 glass p-5 rounded-2xl">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="EventHub" className="w-14 h-14 rounded-xl shadow-lg shadow-red-900/30" />
            <div>
              <h1 className="font-heading text-2xl font-bold text-white">EventHub Check-In</h1>
              <p className="text-[#737373] text-sm mt-0.5">Ready to scan tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            {eventId && (
              <button
                onClick={() => setShowSchedule(true)}
                className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-[#B3B3B3] hover:text-white text-sm flex items-center transition-colors border border-[#1F1F1F] hover:border-[#2A2A2A]"
              >
                <Calendar className="w-4 h-4 mr-2" /> Schedule
              </button>
            )}
            <a href="/admin" className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] text-[#B3B3B3] hover:text-white text-sm flex items-center transition-colors border border-[#1F1F1F] hover:border-[#2A2A2A]">
              <Lock className="w-4 h-4 mr-2" /> Admin Panel
            </a>
            <button onClick={handleLogout} className="flex items-center px-4 py-2.5 bg-[#E11D2E]/10 text-[#FF6B7A] border border-[#E11D2E]/20 rounded-xl hover:bg-[#E11D2E]/15 text-sm transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#141414] p-1 rounded-xl border border-[#1F1F1F] inline-flex">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'scanner' ? 'bg-[#E11D2E] text-white shadow-lg shadow-red-900/30' : 'text-[#737373] hover:text-white'}`}
            >
              <ScanLine className="w-4 h-4" />
              Scanner
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-[#E11D2E] text-white shadow-lg shadow-red-900/30' : 'text-[#737373] hover:text-white'}`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Tab */}
          {(activeTab === 'scanner') && (
            <div className="lg:col-span-2 grid lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Scanner */}
              <div className="bg-[#0D0D0D] border border-[#1F1F1F] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                {/* Scanner Header */}
                <div className="p-5 border-b border-[#1F1F1F] flex justify-between items-center bg-[#141414]">
                  <h2 className="font-heading text-lg font-semibold text-white flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D2E] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E11D2E]"></span>
                    </span>
                    Live Scanner
                  </h2>
                  <span className="text-xs text-[#737373] font-mono bg-[#0D0D0D] px-3 py-1.5 rounded-lg border border-[#1F1F1F]">Camera Active</span>
                </div>

                {/* Scanner View - Centered */}
                <div className="relative aspect-square bg-black group overflow-hidden flex items-center justify-center">
                  <QRScanner onScan={handleScan} />

                  {/* Overlay Elements */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                    {/* Premium Scan Frame */}
                    <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
                      {/* Animated Corner Pieces */}
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#E11D2E] rounded-tl-2xl -mt-1 -ml-1 animate-pulse-slow"></div>
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#E11D2E] rounded-tr-2xl -mt-1 -mr-1 animate-pulse-slow animation-delay-100"></div>
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#E11D2E] rounded-bl-2xl -mb-1 -ml-1 animate-pulse-slow animation-delay-200"></div>
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#E11D2E] rounded-br-2xl -mb-1 -mr-1 animate-pulse-slow animation-delay-300"></div>

                      {/* Scanned Success Effect */}
                      {scanResult?.success && (
                        <div className="absolute inset-0 bg-[#22C55E]/20 animate-pulse rounded-3xl"></div>
                      )}

                      {/* Animated Scanning Line */}
                      <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#E11D2E] to-transparent shadow-[0_0_20px_rgba(225,29,46,0.8)] animate-scan-line"></div>
                    </div>
                  </div>
                </div>

                {/* Instruction and Manual Entry */}
                <div className="p-5 bg-[#0D0D0D] border-t border-[#1F1F1F] space-y-5">
                  {/* Instructions */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#141414] border border-[#1F1F1F]">
                    <div className="p-1.5 bg-[#E11D2E]/10 rounded-full text-[#E11D2E] flex-shrink-0 mt-0.5">
                      <Radio className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-[#B3B3B3] leading-relaxed">
                      Position the <span className="text-white font-medium">QR code</span> within the red frame. The scanner will capture it automatically.
                    </p>
                  </div>

                  {/* Manual Entry */}
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

                {/* Debug Info (Visible only on error) */}
                {scanResult && !scanResult.success && (
                  <div className="p-3 text-[10px] text-[#737373] font-mono bg-black/50 overflow-hidden break-all border-t border-[#1F1F1F]">
                    Last error: {scanResult.message}
                  </div>
                )}
              </div>

              {/* Result & Recent (Visible in Scanner tab too for quick feedback) */}
              <div className="space-y-6 flex flex-col">
                {/* Scan Result */}
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
                            <span className="text-white text-sm">{scanResult.details.email}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-[#737373] text-sm">Event</span>
                          <span className="text-[#FF6B7A] font-medium text-sm">{scanResult.details.event}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Activity Mini (Visible in scanner view) */}
                <div className="glass rounded-2xl p-6 flex-1 min-h-[320px]">
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
                      {recentCheckins.slice(0, 3).map((checkin, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#E11D2E]/20 flex items-center justify-center border border-[#E11D2E]/20 text-white font-bold text-sm">
                              {checkin.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">{checkin.name}</p>
                              <p className="text-[#737373] text-xs">{checkin.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {(activeTab === 'history') && (
            <div className="lg:col-span-2 glass rounded-2xl p-6 min-h-[500px] animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#E11D2E]" />
                  Full History
                </h3>
              </div>

              {recentCheckins.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-[#737373]">
                  <p>No check-in history available yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCheckins.map((checkin, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold">
                          {checkin.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{checkin.name}</p>
                          <p className="text-zinc-500 text-sm">{checkin.event}</p>
                        </div>
                      </div>
                      <span className="text-zinc-500 font-mono text-sm">{checkin.time}</span>
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
