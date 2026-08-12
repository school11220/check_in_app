import { z } from 'zod';

/**
 * Reusable Zod schemas for API request bodies and query params.
 * Keep them small and composable.
 */

export const cuid = z.string().min(1).max(64);
export const email = z.string().email().max(254);
export const phone = z.string().min(7).max(20).optional();
export const nonEmpty = z.string().min(1).max(500);

export const paginationQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export const idParam = z.object({ id: cuid });

export const createEventBody = z.object({
    name: nonEmpty,
    description: z.string().max(5000).optional().default(''),
    date: nonEmpty,
    startTime: z.string().max(20).optional().default(''),
    endTime: z.string().max(20).optional().default(''),
    venue: z.string().max(200).optional().default(''),
    address: z.string().max(500).optional().default(''),
    capacity: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
    price: z.coerce.number().int().min(0).optional().default(0),
    entryFee: z.coerce.number().int().min(0).optional().default(0),
    category: z.string().max(50).optional().default(''),
    imageUrl: z.string().url().max(2000).optional().or(z.literal('')).default(''),
    organizer: z.string().max(200).optional().default(''),
    contactEmail: email.optional().or(z.literal('')),
    contactPhone: phone,
    tags: z.array(z.string().max(50)).max(20).optional().default([]),
});

export const updateEventBody = createEventBody.partial();

export const attendeeInput = z.object({
    name: nonEmpty,
    email: email.optional().or(z.literal('')),
    phone,
    amountPaid: z.coerce.number().int().min(0).optional(),
    status: z.enum(['pending', 'paid', 'cancelled', 'refunded', 'partially_refunded']).optional(),
    notes: z.string().max(1000).optional(),
});

export const createTicketBody = z.object({
    eventId: cuid,
    attendees: z.array(attendeeInput).min(1).max(50),
    quantity: z.coerce.number().int().min(1).max(50).optional(),
    name: z.string().optional(),
    email: email.optional().or(z.literal('')),
    phone,
    promoCode: z.string().max(50).optional(),
});

export const reviewBody = z.object({
    eventId: cuid,
    name: z.string().min(1).max(100),
    email: email.optional().or(z.literal('')),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().min(1).max(2000),
});

export const checkInBody = z.object({
    ticketId: cuid.optional(),
    payload: z.string().min(1).max(4000).optional(),
    eventId: cuid.optional(),
}).refine((v) => v.ticketId || v.payload, {
    message: 'ticketId or payload is required',
});

export const transferTicketBody = z.object({
    ticketId: cuid,
    toName: nonEmpty,
    toEmail: email,
    toPhone: phone,
});

export const cancelTicketBody = z.object({
    ticketId: cuid,
    reason: z.string().max(500).optional(),
});

export const refundTicketBody = z.object({
    ticketId: cuid,
    amount: z.coerce.number().int().min(0).optional(),
    reason: z.string().max(500).optional(),
});
