# Debugging guide

| Symptom | First places to inspect |
|---|---|
| App will not start | `npm run check:env`, `.env.local` names, Prisma generation, `app/layout.tsx` |
| Events absent | `app/page.tsx`, `/api/events`, `lib/prisma.ts`, database connectivity, seed/setup |
| Login/role wrong | `proxy.ts`, `lib/auth.ts`, `lib/clerk-role-utils.ts`, Clerk metadata/org role, webhook sync |
| Payment rejected | Razorpay order/verify routes, signature/order/status, amount units, provider dashboard |
| Ticket email missing | `lib/email.ts`, `lib/ticket-email.ts`, SMTP/Gmail variables, delivery logs |
| QR rejected | `lib/scan-payload.ts`, `ticket-security.ts`, `qr-security.ts`, token/secret, expiry |
| Check-in duplicate/failure | `app/api/checkin/route.ts`, ticket status, event assignment, `CheckInLog` |
| Build/type failure | `npm run typecheck`, `npm run lint`, `npm run build`, route params/types |
| Rate limit absent | `lib/rate-limit.ts`, Upstash variables and provider state |
| Deploy failure | Vercel build logs, env configuration, Prisma generate, database reachability |

Do not use unverified commands or claim live provider behavior without checking the provider.
