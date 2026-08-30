# Data flows

## Ticket payment

Browser → ticket creation → pending Ticket rows → promo validation/pricing → Razorpay order → browser payment → signature verification → payment fetch → transaction marks paid/generates token/increments Event soldCount → email/PDF link → attendee ticket.

## Check-in

Scanner → decode payload → ticket/token lookup → timed HMAC and lifecycle checks → event-role access → transaction updates checkedIn and creates CheckInLog → scanner feedback.

## User sync

Clerk user event → verified webhook → `upsertUserFromClerk()` → local User row used by sessions and assignments.

## Event management

Admin/Organizer form → event route → role/event authorization → validation → Prisma Event write → dashboard/public reads.

## Export/certificate

Authorized operational action → query tickets/events → CSV/PDF/certificate helper → response or email delivery; failures are route/log dependent.
