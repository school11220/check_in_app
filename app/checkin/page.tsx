'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { useToast } from '@/components/Toaster';
import QRScanner from '@/components/QRScanner';
import { useRouter } from 'next/navigation';
import { ScanLine, LogOut, Ticket, Lock, CheckCircle, XCircle } from 'lucide-react';

export default function CheckinPage() {
  const { events } = useApp();
  const router = useRouter();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
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

  // Login Screen for non-admins
  // Middleware ensures auth
  // if (!isAdminLoggedIn) ... removed

  return (
    <main className="min-h-screen py-6 px-4 pb-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 glass-light p-4 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
              <ScanLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EventHub Check-In</h1>
              <p className="text-zinc-400 text-xs md:text-sm">Ready to scan tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <a href="/admin" className="px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm flex items-center transition-colors border border-white/5">
              <Lock className="w-4 h-4 mr-2" /> Admin Panel
            </a>
            <button onClick={handleLogout} className="flex items-center px-4 py-2 bg-red-900/20 text-red-400 border border-red-900/30 rounded-lg hover:bg-red-900/30 text-sm transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Scanner */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Live Scanner
              </h2>
              <span className="text-xs text-zinc-500 font-mono">Camera Active</span>
            </div>

            <div className="relative aspect-square bg-black group overflow-hidden">
              <QRScanner onScan={handleScan} />

              {/* Overlay Elements */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                {/* Scan Frame */}
                <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-xl -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-xl -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-xl -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-xl -mb-1 -mr-1"></div>

                  {/* Scanned Success Effect */}
                  {scanResult?.success && (
                    <div className="absolute inset-0 bg-green-500/20 animate-pulse rounded-3xl"></div>
                  )}

                  {/* Scanning Line Animation */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-scan-line opacity-80"></div>
                </div>
              </div>
            </div>

            {/* Instruction and Manual Entry */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                <div className="p-1 bg-zinc-800 rounded-full mt-0.5">
                  <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Position the QR code within the red frame. The scanner will capture it automatically.
                </p>
              </div>
              <form onSubmit={handleManualSubmit} className="relative">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter ticket code manually"
                  className="w-full pl-4 pr-24 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || isProcessing}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                >
                  {isProcessing ? '...' : 'Verify'}
                </button>
              </form>
            </div>

            {/* Debug Info (Visible only on error) */}
            {scanResult && !scanResult.success && (
              <div className="p-2 text-[10px] text-zinc-600 font-mono bg-black/50 overflow-hidden break-all">
                Last error: {scanResult.message}
              </div>
            )}
          </div>

          {/* Result & Recent */}
          <div className="space-y-6 flex flex-col h-full">
            {/* Scan Result */}
            {scanResult && (
              <div className={`p-6 rounded-3xl backdrop-blur-md border animate-slide-in ${scanResult.success
                ? 'bg-green-950/30 border-green-500/30 shadow-[0_0_30px_rgba(22,163,74,0.1)]'
                : 'bg-red-950/30 border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.1)]'
                }`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-full ${scanResult.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {scanResult.success ? (
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${scanResult.success ? 'text-green-400' : 'text-red-400'}`}>
                      {scanResult.success ? 'Access Granted' : 'Access Denied'}
                    </h3>
                    <p className="text-zinc-400 text-sm mt-1">{scanResult.message}</p>
                  </div>
                </div>

                {scanResult.details && (
                  <div className="space-y-3 bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-zinc-500 text-sm">Guest</span>
                      <span className="text-white font-medium">{scanResult.details.name}</span>
                    </div>
                    {scanResult.details.email && (
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-zinc-500 text-sm">Email</span>
                        <span className="text-white font-medium text-sm">{scanResult.details.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-sm">Event</span>
                      <span className="text-red-400 font-medium text-sm">{scanResult.details.event}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Check-ins */}
            <div className="glass-card rounded-3xl p-6 flex-1 min-h-[300px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <div className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">Live</div>
              </div>

              {recentCheckins.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-zinc-600">
                  <ScanLine className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Waiting for scans...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCheckins.map((checkin, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-white/10 text-xs font-bold text-zinc-300">
                          {checkin.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{checkin.name}</p>
                          <p className="text-zinc-500 text-xs truncate max-w-[150px]">{checkin.event}</p>
                        </div>
                      </div>
                      <span className="text-zinc-500 text-xs font-mono">{checkin.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
