import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function enqueuePaymentRecovery(input: {
  operation: string; orderId?: string | null; paymentId?: string | null; ticketId?: string | null; eventId?: string | null; payload: Record<string, unknown>; error: unknown;
}) {
  try {
    return await prisma.paymentRecoveryJob.create({ data: {
      operation: input.operation, orderId: input.orderId || null, paymentId: input.paymentId || null,
      ticketId: input.ticketId || null, eventId: input.eventId || null, payload: input.payload as Prisma.InputJsonValue,
      status: 'pending', lastError: input.error instanceof Error ? input.error.message : String(input.error),
    } });
  } catch (queueError) {
    console.error('Failed to persist payment recovery job', queueError);
    return null;
  }
}
