import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { timingSafeStringEqual } from '@/lib/ticket-security';
import { enqueuePaymentRecovery } from '@/lib/payment-recovery';

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ success: false, error: 'Webhook not configured', code: 'CONFIGURATION_ERROR' }, { status: 503 });
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!signature || !timingSafeStringEqual(expected, signature)) return NextResponse.json({ success: false, error: 'Invalid webhook signature', code: 'AUTHORIZATION_ERROR' }, { status: 401 });
  try {
    const payload = JSON.parse(raw) as Record<string, any>;
    const event = String(payload.event || '');
    if (!['payment.failed', 'payment.captured', 'order.paid'].includes(event)) return NextResponse.json({ success: true, accepted: true });
    const payment = payload.payload?.payment?.entity || {};
    const order = payload.payload?.order?.entity || {};
    await enqueuePaymentRecovery({
      operation: `webhook_${event.replace('.', '_')}`,
      orderId: payment.order_id || order.id || null,
      paymentId: payment.id || null,
      payload: { event, orderId: payment.order_id || order.id || null, paymentId: payment.id || null, status: payment.status || null },
      error: event === 'payment.failed' ? (payment.error_description || 'Razorpay reported a failed payment') : 'Webhook reconciliation requested',
    });
    return NextResponse.json({ success: true, accepted: true });
  } catch (error) {
    console.error('Razorpay webhook processing failed', error);
    return NextResponse.json({ success: false, error: 'Invalid webhook payload', code: 'VALIDATION_ERROR' }, { status: 400 });
  }
}
