'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { generateQRCode } from '@/lib/utils';
import { TicketData } from '@/types';

export default function TicketPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticketId = params.id as string;
  const success = searchParams.get('success');

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [qrCode, setQRCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTicket() {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        
        if (!response.ok) {
          throw new Error('Ticket not found');
        }

        const data: TicketData = await response.json();
        setTicket(data);

        // Generate QR code if ticket is paid
        if (data.status === 'paid' && data.token) {
          const qr = await generateQRCode(data.id, data.token);
          setQRCode(qr);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load ticket');
      } finally {
        setLoading(false);
      }
    }

    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error || 'Ticket not found'}</p>
          <a
            href="/"
            className="mt-6 inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {success === 'true' && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            ✅ Payment successful! Your ticket is ready.
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">🎫 Event Ticket</h1>
            <p className="text-blue-100">Status: {ticket.status.toUpperCase()}</p>
          </div>

          {/* Ticket Details */}
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm text-gray-600 font-medium">Name</label>
              <p className="text-lg font-semibold text-gray-900">{ticket.name}</p>
            </div>

            {ticket.email && (
              <div>
                <label className="text-sm text-gray-600 font-medium">Email</label>
                <p className="text-gray-900">{ticket.email}</p>
              </div>
            )}

            {ticket.phone && (
              <div>
                <label className="text-sm text-gray-600 font-medium">Phone</label>
                <p className="text-gray-900">{ticket.phone}</p>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600 font-medium">Event ID</label>
              <p className="text-gray-900">{ticket.eventId}</p>
            </div>

            <div>
              <label className="text-sm text-gray-600 font-medium">Ticket ID</label>
              <p className="text-xs text-gray-600 font-mono break-all">{ticket.id}</p>
            </div>

            {ticket.checkedIn && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-semibold">✅ Checked In</p>
              </div>
            )}
          </div>

          {/* QR Code */}
          {ticket.status === 'paid' && qrCode && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Your Entry QR Code
              </h2>
              <div className="flex justify-center mb-4">
                <img 
                  src={qrCode} 
                  alt="Ticket QR Code" 
                  className="w-64 h-64 border-4 border-white rounded-lg shadow-md"
                />
              </div>
              <p className="text-sm text-center text-gray-600">
                Show this QR code at the event entrance
              </p>
            </div>
          )}

          {ticket.status === 'pending' && (
            <div className="p-6 bg-yellow-50 border-t border-yellow-200">
              <p className="text-yellow-800 text-center">
                ⏳ Payment pending. Complete payment to receive your QR code.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
