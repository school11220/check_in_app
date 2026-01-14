'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { useToast } from '@/components/Toaster';
import QRScanner from '@/components/QRScanner';

export default function CheckinPage() {
  const { isAdminLoggedIn, loginAdmin, events, logoutAdmin } = useApp();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(password)) {
      showToast('Login successful!', 'success');
    } else {
      showToast('Invalid password', 'error');
    }
    setPassword('');
  };

  const handleScan = async (code: string) => {
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

      // Call the check-in API
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, token }),
      });

      const result = await response.json();

      if (result.success) {
        const event = events.find(e => e.id === result.ticket?.eventId);
        setScanResult({
          success: true,
          message: result.message || 'Check-in successful!',
          details: {
            name: result.ticket?.name,
            event: event?.name || 'Event',
            ticketId: result.ticket?.id,
          }
        });

        setRecentCheckins(prev => [{
          id: result.ticket?.id,
          name: result.ticket?.name,
          event: event?.name || 'Event',
          time: new Date().toLocaleTimeString()
        }, ...prev.slice(0, 4)]);

        showToast(`Welcome, ${result.ticket?.name}!`, 'success');
      } else {
        setScanResult({ success: false, message: result.message || 'Check-in failed' });
        showToast(result.message || 'Check-in failed', 'error');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setScanResult({ success: false, message: 'Failed to verify ticket' });
      showToast('Failed to verify ticket', 'error');
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
  if (!isAdminLoggedIn) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Staff Check-In Portal</h1>
            <p className="text-zinc-400 text-sm">Admin login required</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-lg tracking-widest"
              autoFocus
            />
            <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold">
              Login
            </button>
          </form>
          <p className="text-center text-zinc-500 text-xs mt-6">Password: admin123</p>
          <a href="/" className="block text-center text-zinc-400 hover:text-white mt-4 text-sm">← Back to Home</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Check-In Portal</h1>
              <p className="text-zinc-500 text-sm">Scan tickets to verify entry</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-zinc-400 hover:text-white text-sm">Admin</a>
            <button onClick={logoutAdmin} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 text-sm">
              Logout
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Scan QR Code</h2>
            <QRScanner onScan={handleScan} />

            {/* Manual Entry */}
            <form onSubmit={handleManualSubmit} className="mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Or enter code manually"
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm"
                />
                <button type="submit" className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700">
                  Verify
                </button>
              </div>
            </form>
          </div>

          {/* Result & Recent */}
          <div className="space-y-6">
            {/* Scan Result */}
            {scanResult && (
              <div className={`p-6 rounded-2xl ${scanResult.success ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {scanResult.success ? (
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className={`text-lg font-semibold ${scanResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {scanResult.message}
                  </span>
                </div>
                {scanResult.details && (
                  <div className="space-y-1 text-sm">
                    <p className="text-white"><span className="text-zinc-400">Name:</span> {scanResult.details.name}</p>
                    <p className="text-white"><span className="text-zinc-400">Event:</span> {scanResult.details.event}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Check-ins */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Check-ins</h3>
              {recentCheckins.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No check-ins yet</p>
              ) : (
                <div className="space-y-3">
                  {recentCheckins.map((checkin, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div>
                        <p className="text-white font-medium">{checkin.name}</p>
                        <p className="text-zinc-500 text-sm">{checkin.event}</p>
                      </div>
                      <span className="text-zinc-400 text-sm">{checkin.time}</span>
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
