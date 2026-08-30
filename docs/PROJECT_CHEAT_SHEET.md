# EventHub Project Cheat Sheet

**Project:** EventHub / `checkin`

**Purpose:** Event discovery, registration, ticketing, payment, attendee operations, and QR check-in.

**Problem:** Event teams need one workflow for publishing events, selling/issuing tickets, managing attendees, and validating entry.

**Users:** Public attendees; Admins; Organizers; Scanners.

**Tech stack:** Next.js 16, React 19, TypeScript, Prisma 6, PostgreSQL, Clerk, Razorpay, Nodemailer/SMTP, optional Upstash Redis, Tailwind, Recharts, ZXing, PWA.

**Architecture:** Single deployable modular monolith with App Router pages and API route handlers.

**Frontend:** `app/**`, `components/**`, `lib/store`, hooks; responsive/PWA UI.

**Backend:** Next.js route handlers in `app/api/**`; domain helpers in `lib/**`.

**Database:** PostgreSQL through Prisma; 15 models; `Event` is the central aggregate.

**Authentication:** Clerk session plus Clerk API user lookup and optional local user sync/webhook.

**Authorization:** Admin/Organizer/Scanner roles and assigned event IDs; enforced in middleware and route handlers.

**Payments:** Razorpay order creation and signature/gateway verification; no payment webhook found.

**AI:** None identified.

**External services:** Clerk, Razorpay, SMTP/Gmail, optional Upstash Redis, optional Fast2SMS, Vercel.

**Important files:** `proxy.ts`, `lib/auth.ts`, `lib/api-helpers/index.ts`, `prisma/schema.prisma`, `lib/pricing.ts`, `lib/ticket-security.ts`, `lib/qr-security.ts`, `app/api/tickets/route.ts`, `app/api/checkin/route.ts`, `app/api/razorpay/verify/route.ts`.

**Important functions:** `getSession()`, `hasEventAccess()`, `calculateTicketUnitPrice()`, `calculateDynamicPrice()`, `allocatePaidAmount()`, `generateTicketToken()`, `verifyTimedQRToken()`, `authorizeTicketAccess()`, `getTicketLifecycleStatus()`.

**Security:** HMAC ticket/QR/audit values, timing-safe compares, Clerk, Zod, optional rate limiting. Review public email routes, truncated QR HMAC, upload validation, and missing rate-limit configuration.

**Major risks:** Best-effort email, no queue/retry evidence, no migration directory, route-level auth drift, single PostgreSQL dependency.

## 10 things I must understand

1. Clerk identity and app role resolution are separate from local `User` persistence.
2. `proxy.ts` protects navigation; APIs must protect themselves.
3. Admin is global; Organizer/Scanner are event-scoped.
4. Ticket prices are stored as integer paise.
5. Payment verification is the authority that changes pending tickets to paid.
6. Capacity increments happen transactionally with conditional checks.
7. A checked-in ticket is a paid-like ticket with `checkedIn=true`.
8. QR/ticket integrity depends on `TICKET_SECRET_KEY`.
9. Email failure does not undo successful payment.
10. No AI or queue system is implemented in this checkout.

## 20 most likely viva questions

See the master document; the short list is: monolith choice, role enforcement, API middleware, event scoping, ticket lifecycle, QR HMAC, payment signature, idempotency, capacity race, promo allocation, email failure, Clerk vs DB, JSON fields, Upstash fallback, frontend security, test gaps, scaling, new API path, lack of AI, and lack of migrations.
