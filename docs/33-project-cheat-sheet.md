# Code index

| Concept | Files/functions |
|---|---|
| Authentication | `proxy.ts`, `lib/auth.ts:getSession`, `lib/clerk-roles.ts` |
| Roles | `lib/clerk-role-utils.ts`, `lib/auth.ts:hasRole/hasEventAccess` |
| Database | `prisma/schema.prisma`, `lib/prisma.ts` |
| API errors | `lib/api-helpers/index.ts:respond`, `ApiError`, `parseBody` |
| Pricing | `lib/pricing.ts` |
| Ticket lifecycle | `lib/ticket-lifecycle.ts` |
| Ticket access | `lib/ticket-access.ts:authorizeTicketAccess` |
| Ticket HMAC | `lib/ticket-security.ts` |
| QR security | `lib/qr-security.ts` |
| Check-in | `app/api/checkin/route.ts`, `components/QRScanner.tsx` |
| Payments | `app/api/razorpay/order/route.ts`, `verify/route.ts` |
| Email | `lib/email.ts`, `lib/ticket-email.ts` |
| Rate limit | `lib/rate-limit.ts` |
| State | `lib/store/index.tsx`, `hooks/useOfflineCheckin.ts` |
| Testing | `scripts/run-tests.ts` |
| Deployment | `package.json`, `next.config.ts`, `vercel.json` |

Use this index to answer: what is it, who calls it, what it calls, what data it uses, how it fails, and how to modify it.
