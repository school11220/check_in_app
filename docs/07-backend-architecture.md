# Backend architecture

The backend is implemented by Next.js route handlers under `app/api`. `lib/auth.ts` creates a compatibility session object from Clerk/local User state. `lib/api-helpers` provides `respond`, typed API errors, and Zod parsing. Some routes use these helpers; others contain local validation and error handling. `lib/prisma.ts` owns the Prisma singleton. Domain helpers centralize pricing, ticket lifecycle, access, security, time slots, exports, and generation.

Failure handling is not uniform: helper-wrapped handlers return generic 500 JSON, while direct handlers log and return route-specific responses. Email and some external calls are explicitly best-effort.
