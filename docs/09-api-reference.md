# API reference

## Public or token-authorized flows

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/analytics` | analytics data path; inspect caller-specific checks |
| POST | `/api/promo/validate` | validate checkout promo |
| POST | `/api/razorpay/order` | create payment order |
| POST | `/api/razorpay/verify` | verify payment and settle tickets |
| GET | `/api/tickets/[id]` | ticket access |
| GET | `/api/tickets/[id]/qr` | QR output |
| GET | `/api/tickets/[id]/pdf` | PDF output |
| GET | `/api/tickets/[id]/ics` | calendar output |
| POST | `/api/tickets/transfer` | ticket transfer flow |

## Authenticated/admin/organizer flows

`/api/auth/me`, `/api/events`, `/api/events/[id]`, `/api/events/[id]/sessions`, `/api/events/[id]/slots`, `/api/events/[id]/duplicate`, `/api/events/[id]/export`, `/api/tickets`, `/api/tickets/bulk`, `/api/tickets/cancel`, `/api/tickets/deliver`, `/api/tickets/refund`, `/api/me/tickets`, `/api/checkin`, `/api/checkin/bulk`, `/api/checkin/audit`, `/api/checkin/audit/export`, `/api/attendees/import`, `/api/reviews`, `/api/settings`, `/api/export`, `/api/sessions/all`, `/api/slots/all`, `/api/upload`, and the admin routes.

## Complete method inventory

| Route | Methods |
|---|---|
| `/api/admin/audit-logs` | GET |
| `/api/admin/certificates/send` | POST |
| `/api/admin/clerk-users` | GET, POST, DELETE |
| `/api/admin/dashboard` | GET |
| `/api/admin/pricing-rules` | GET, POST |
| `/api/admin/pricing-rules/[id]` | PATCH, DELETE |
| `/api/admin/promo-codes` | GET, POST, PATCH, DELETE |
| `/api/admin/scanners` | GET, POST, PATCH, DELETE |
| `/api/admin/tickets` | GET |
| `/api/analytics` | GET |
| `/api/analytics/cohort` | GET |
| `/api/analytics/funnel` | GET |
| `/api/attendees/import` | POST |
| `/api/auth/me` | GET |
| `/api/checkin` | GET, POST |
| `/api/checkin/audit` | GET |
| `/api/checkin/audit/export` | GET |
| `/api/checkin/bulk` | POST |
| `/api/email/send` | POST |
| `/api/email/send-certificate` | POST |
| `/api/events` | GET, POST, PATCH, DELETE |
| `/api/events/[id]` | GET, PATCH, DELETE |
| `/api/events/[id]/duplicate` | POST |
| `/api/events/[id]/export` | GET |
| `/api/events/[id]/sessions` | GET, POST, PUT, DELETE |
| `/api/events/[id]/slots` | GET, POST, DELETE |
| `/api/export` | GET |
| `/api/me/tickets` | GET |
| `/api/promo` | GET, POST, PATCH, DELETE |
| `/api/promo/validate` | POST |
| `/api/razorpay/order` | POST |
| `/api/razorpay/verify` | POST |
| `/api/reviews` | GET, POST |
| `/api/sessions/all` | GET |
| `/api/settings` | GET, POST |
| `/api/slots/all` | GET |
| `/api/tickets` | GET, POST |
| `/api/tickets/[id]` | GET |
| `/api/tickets/[id]/ics` | GET |
| `/api/tickets/[id]/pdf` | GET |
| `/api/tickets/[id]/qr` | GET |
| `/api/tickets/bulk` | POST |
| `/api/tickets/cancel` | POST |
| `/api/tickets/deliver` | POST |
| `/api/tickets/refund` | POST |
| `/api/tickets/transfer` | POST |
| `/api/upload` | POST |
| `/api/webhooks/clerk` | POST |

Admin routes: dashboard, tickets, audit logs, Clerk users, scanners, promo codes, pricing rules, certificates. Exact request fields are defined in each route and `lib/api-helpers/schemas.ts`; use those files as the contract when changing clients. Status conventions include 400 validation, 401 unauthenticated, 403 unauthorized role, 404 missing resource, 409 capacity/conflict, 429 rate limit, and 500 configuration/unexpected errors.
