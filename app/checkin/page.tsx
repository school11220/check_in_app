'use client';

import { useState } from 'react';
import { CheckInResponse } from '@/types';
import QRScanner from '@/components/QRScanner';

export default function CheckInPage() {
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [scanMode, setScanMode] = useState<'manual' | 'camera'>('manual');

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Parse QR code data
      const data = JSON.parse(qrInput);
      const { ticketId, token } = data;

      if (!ticketId || !token) {
        throw new Error('Invalid QR code format');
      }

      // Call check-in API
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, token }),
      });

      const result: CheckInResponse = await response.json();
      setResult(result);

      // Clear input if successful
      if (result.success) {
        setQrInput('');
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Invalid QR code',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (data: string) => {
    setQrInput(data);
    // Auto-submit when scanned
    setLoading(true);
    setResult(null);

    try {
      // Parse QR code data
      const parsedData = JSON.parse(data);
      const { ticketId, token } = parsedData;

      if (!ticketId || !token) {
        throw new Error('Invalid QR code format');
      }

      // Call check-in API
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, token }),
      });

      const result: CheckInResponse = await response.json();
      setResult(result);

      // Clear input if successful
      if (result.success) {
        setQrInput('');
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Invalid QR code',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScanAnother = () => {
    setResult(null);
    setQrInput('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Check-In Portal
          </h1>
          <p className="text-gray-600">
            Scan ticket QR codes to verify and check in attendees
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {!result ? (
            <>
              {/* Mode Toggle - Removed, Camera is default */}
              <div className="p-6">
                {/* Camera Scanner Mode */}
                <QRScanner
                  onScan={handleQRScan}
                  onError={(error) => {
                    setResult({
                      success: false,
                      message: error,
                    });
                  }}
                  autoStart={true}
                />
                {loading && (
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-3 bg-purple-50 text-purple-700 px-6 py-3 rounded-xl font-medium">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying ticket...
                    </div>
                  </div>
                )}
              </div>
              
              {/* Manual Input Option */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Manual QR Data Entry
                    </span>
                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <form onSubmit={handleCheckIn} className="mt-4 space-y-3">
                    <textarea
                      id="qrInput"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder='{"ticketId":"...","token":"..."}'
                      rows={4}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs text-gray-900 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                    >
                      {loading ? 'Verifying...' : 'Verify Ticket'}
                    </button>
                  </form>
                </details>
              </div>
            </>
          ) : (
            /* Result Display */
            <div className="p-6">
              <div
                className={`rounded-xl p-8 text-center ${
                  result.success
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50'
                    : 'bg-gradient-to-br from-red-50 to-pink-50'
                }`}
              >
                {/* Icon */}
                <div className="mb-4">
                  {result.success ? (
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full shadow-lg">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500 rounded-full shadow-lg">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Message */}
                <h2
                  className={`text-2xl font-bold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'Check-In Successful!' : 'Check-In Failed'}
                </h2>
                <p
                  className={`text-lg mb-6 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>

                {/* Ticket Details */}
                {result.ticket && (
                  <div className="bg-white rounded-xl p-6 shadow-md space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Attendee</span>
                      <span className="font-semibold text-gray-900">{result.ticket.name}</span>
                    </div>
                    {result.ticket.email && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Email</span>
                        <span className="text-sm text-gray-900">{result.ticket.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Event ID</span>
                      <span className="font-mono text-sm text-gray-900">{result.ticket.eventId}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          result.ticket.checkedIn
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {result.ticket.checkedIn && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {result.ticket.checkedIn ? 'Checked In' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleScanAnother}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                Scan Next Ticket
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
