import type { Prisma } from '@prisma/client';

// Keep ticket/payment reads compatible with databases that predate the optional
// event-branding columns. `include: { Event: true }` asks Prisma for every
// scalar column and therefore crashes when a deployment has not added those
// optional columns yet.
export const EVENT_SELECT = {
  id: true,
  name: true,
  description: true,
  date: true,
  startTime: true,
  endTime: true,
  venue: true,
  address: true,
  price: true,
  entryFee: true,
  prizePool: true,
  category: true,
  imageUrl: true,
  capacity: true,
  soldCount: true,
  isActive: true,
  isFeatured: true,
  schedule: true,
  speakers: true,
  sponsors: true,
  tags: true,
  organizer: true,
  organizerId: true,
  contactEmail: true,
  contactPhone: true,
  termsAndConditions: true,
  registrationDeadline: true,
  earlyBirdEnabled: true,
  earlyBirdPrice: true,
  earlyBirdDeadline: true,
  sendReminders: true,
  createdAt: true,
  updatedAt: true,
  registrationFields: true,
  organizerVideoLink: true,
  videoLink: true,
} satisfies Prisma.EventSelect;

export const EVENT_WITH_PRICING_SELECT = {
  ...EVENT_SELECT,
  PricingRule: true,
} satisfies Prisma.EventSelect;
