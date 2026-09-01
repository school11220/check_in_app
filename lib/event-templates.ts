import { Prisma } from '@prisma/client';

export const EVENT_TEMPLATE_FIELDS = [
  'description', 'startTime', 'endTime', 'venue', 'address', 'price', 'entryFee',
  'prizePool', 'category', 'imageUrl', 'capacity', 'isFeatured', 'schedule',
  'speakers', 'sponsors', 'tags', 'organizer', 'contactEmail', 'contactPhone',
  'termsAndConditions', 'earlyBirdEnabled', 'earlyBirdPrice', 'sendReminders',
  'registrationFields', 'organizerVideoLink', 'videoLink',
] as const;

export function snapshotEventTemplate(event: Record<string, unknown>): Prisma.InputJsonObject {
  return Object.fromEntries(
    EVENT_TEMPLATE_FIELDS
      .filter((field) => event[field] !== undefined)
      .map((field) => [field, event[field] === null ? Prisma.JsonNull : event[field]]),
  ) as Prisma.InputJsonObject;
}

export function templateEventCreateData(
  templateData: unknown,
  input: { name: string; date: Date; organizerId?: string | null },
): Prisma.EventUncheckedCreateInput {
  const raw = templateData && typeof templateData === 'object' && !Array.isArray(templateData)
    ? templateData as Record<string, unknown>
    : {};
  const allowed = snapshotEventTemplate(raw);
  return {
    ...allowed,
    id: crypto.randomUUID(),
    name: input.name,
    date: input.date,
    organizerId: input.organizerId ?? null,
    soldCount: 0,
    isActive: false,
    sendReminders: false,
    registrationDeadline: null,
    earlyBirdDeadline: null,
  } as Prisma.EventUncheckedCreateInput;
}

export function templateChildren(templateData: unknown) {
  const raw = templateData && typeof templateData === 'object' && !Array.isArray(templateData)
    ? templateData as Record<string, unknown>
    : {};
  const pricingRules = Array.isArray(raw._pricingRules) ? raw._pricingRules : [];
  const sessions = Array.isArray(raw._sessions) ? raw._sessions : [];
  return { pricingRules, sessions };
}
