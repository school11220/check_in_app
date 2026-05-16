import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function logSecurityEvent(request: NextRequest, data: {
  type: string;
  key: string;
  ticketId?: string | null;
  eventId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.securityEvent.create({
      data: {
        type: data.type,
        key: data.key,
        ticketId: data.ticketId || null,
        eventId: data.eventId || null,
        ipAddress: getRequestIp(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: (data.details || {}) as any,
      },
    });
  } catch {
    // Security logging should not make the user-facing route fail.
  }
}

export async function countRecentSecurityEvents(type: string, key: string, windowMs: number) {
  try {
    return await prisma.securityEvent.count({
      where: {
        type,
        key,
        createdAt: { gte: new Date(Date.now() - windowMs) },
      },
    });
  } catch {
    return 0;
  }
}

export async function isSecurityKeyBlocked(type: string, key: string, threshold: number, windowMs: number) {
  return (await countRecentSecurityEvents(type, key, windowMs)) >= threshold;
}
