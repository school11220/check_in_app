import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const attendeeSegmentFiltersSchema = z.object({
  statuses: z.array(z.string().min(1).max(40)).max(20).default([]),
  checkedIn: z.boolean().nullable().default(null),
  hasEmail: z.boolean().nullable().default(null),
  hasPhone: z.boolean().nullable().default(null),
  paymentMethods: z.array(z.string().min(1).max(60)).max(20).default([]),
  createdFrom: z.string().datetime().nullable().default(null),
  createdTo: z.string().datetime().nullable().default(null),
  search: z.string().trim().max(120).default(''),
});

export type AttendeeSegmentFilters = z.infer<typeof attendeeSegmentFiltersSchema>;

export function buildAttendeeWhere(
  filters: AttendeeSegmentFilters,
  eventIds: string[],
): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = { eventId: { in: eventIds } };

  if (filters.statuses.length) where.status = { in: filters.statuses };
  if (filters.checkedIn !== null) where.checkedIn = filters.checkedIn;
  if (filters.hasEmail !== null) where.email = filters.hasEmail ? { not: null } : null;
  if (filters.hasPhone !== null) where.phone = filters.hasPhone ? { not: null } : null;
  if (filters.paymentMethods.length) where.paymentMethod = { in: filters.paymentMethods };
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      ...(filters.createdFrom ? { gte: new Date(filters.createdFrom) } : {}),
      ...(filters.createdTo ? { lte: new Date(filters.createdTo) } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search } },
      { id: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}
