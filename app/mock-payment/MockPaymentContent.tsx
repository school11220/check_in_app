'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function MockPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketId = searchParams.get('ticketId');
  const amount = searchParams.get('amount');
  const [processing, setProcessing] = useState(false);

  const handlePayment = async (success: boolean) => {
    setProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (success) {
      // Call the callback API to mark payment as successful
      try {
        const response = await fetch('/api/phonepe/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionId: ticketId,
            status: 'SUCCESS',
          }),
        });

        if (response.ok) {
          // Redirect to ticket page
          router.push(`/ticket/${ticketId}?success=true`);
        } else {
          alert('Payment processing failed');
          setProcessing(false);
        }
      } catch (error) {
        alert('Payment processing failed');
        setProcessing(false);
      }
    } else {
      // Payment cancelled
      router.push('/?payment_failed=true');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">💳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Mock Payment Gateway
          </h1>
          <p className="text-sm text-gray-600">
            Testing Mode - Simulating PhonePe Payment
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold text-gray-900">
              ₹{amount ? parseInt(amount) / 100 : 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket ID:</span>
            <span className="font-mono text-xs text-gray-900 break-all">
              {ticketId}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handlePayment(true)}
            disabled={processing}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {processing ? '⏳ Processing...' : '✅ Simulate Success Payment'}
          </button>

          <button
            onClick={() => handlePayment(false)}
            disabled={processing}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            ❌ Simulate Failed Payment
          </button>
        </div>

        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> This is a mock payment gateway for testing. In production, this will redirect to real PhonePe payment page.
          </p>
        </div>
      </div>
    </div>
  );
}
