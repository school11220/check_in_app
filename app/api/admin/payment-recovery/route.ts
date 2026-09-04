import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { badRequest, forbidden, respond, unauthorized } from '@/lib/api-helpers';

export const GET = respond(async (request: NextRequest) => {
  const session = await getSession(); if (!session) throw unauthorized(); if (session.user.role !== 'ADMIN') throw forbidden();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1)); const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') || 25))); const status = request.nextUrl.searchParams.get('status') || 'pending';
  const where = status === 'all' ? {} : { status };
  const [items, total] = await Promise.all([prisma.paymentRecoveryJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), prisma.paymentRecoveryJob.count({ where })]);
  return NextResponse.json({ success: true, items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}, { auth: 'admin' });

export const POST = respond(async (request: NextRequest) => {
  const session = await getSession(); if (!session) throw unauthorized(); if (session.user.role !== 'ADMIN') throw forbidden();
  const body = await request.json().catch(() => null) as { id?: string; action?: string } | null;
  if (!body?.id || !['retry', 'dismiss'].includes(body.action || '')) throw badRequest('A recovery job ID and retry or dismiss action are required');
  const job = await prisma.paymentRecoveryJob.findUnique({ where: { id: body.id } }); if (!job) throw badRequest('Recovery job not found');
  if (body.action === 'retry' && job.operation === 'payment_verification' && job.payload && typeof job.payload === 'object') {
    const payload = job.payload as Record<string, any>;
    if (payload.signature && payload.orderId && payload.paymentId && payload.ticketId) {
      const retryResponse = await fetch(new URL('/api/razorpay/verify', request.url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_order_id: payload.orderId, razorpay_payment_id: payload.paymentId, razorpay_signature: payload.signature, ticketId: payload.ticketId }) });
      const retryBody = await retryResponse.json().catch(() => ({}));
      const updated = await prisma.paymentRecoveryJob.update({ where: { id: job.id }, data: retryResponse.ok ? { status: 'resolved', processedAt: new Date(), lastError: null, attempts: { increment: 1 } } : { status: 'pending', nextAttemptAt: new Date(Date.now() + 60000), lastError: retryBody.error || 'Retry failed', attempts: { increment: 1 } } });
      return NextResponse.json({ success: retryResponse.ok, job: updated, retry: retryBody }, { status: retryResponse.ok ? 200 : 502 });
    }
  }
  const updated = await prisma.paymentRecoveryJob.update({ where: { id: job.id }, data: body.action === 'dismiss' ? { status: 'dismissed', processedAt: new Date() } : { status: 'pending', nextAttemptAt: new Date(), lastError: 'Queued for manual reconciliation' } });
  return NextResponse.json({ success: true, job: updated });
}, { auth: 'admin' });
