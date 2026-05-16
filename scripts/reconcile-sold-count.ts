import { prisma } from '../lib/prisma';
import { PAID_LIKE_STATUSES } from '../lib/ticket-lifecycle';

async function main() {
  const [events, paidCounts] = await Promise.all([
    prisma.event.findMany({ select: { id: true, soldCount: true } }),
    prisma.ticket.groupBy({
      by: ['eventId'],
      where: { status: { in: [...PAID_LIKE_STATUSES] } },
      _count: { id: true },
    }),
  ]);

  const countByEvent = new Map(paidCounts.map((row) => [row.eventId, row._count.id]));
  const updates = events
    .map((event) => ({ id: event.id, current: event.soldCount, next: countByEvent.get(event.id) || 0 }))
    .filter((event) => event.current !== event.next);

  if (updates.length === 0) {
    console.log('Sold counts are already in sync');
    return;
  }

  await prisma.$transaction(
    updates.map((event) => prisma.event.update({
      where: { id: event.id },
      data: { soldCount: event.next },
    }))
  );

  console.log(`Reconciled soldCount for ${updates.length} event(s)`);
}

main()
  .catch((error) => {
    console.error('Failed to reconcile sold counts:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
