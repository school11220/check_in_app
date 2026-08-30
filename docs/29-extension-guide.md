# Extension guide

## New API

Add `app/api/<resource>/route.ts` → choose `respond()`/Zod or match the route's explicit convention → enforce role and event ownership → use Prisma/domain helper → return stable JSON/status → add client caller and tests.

## New entity

Update `prisma/schema.prisma` → adopt a real migration workflow before production → add indexes/relations → query helper/route → validation → UI → tests and seed only if justified.

## New page

Add App Router page → place it in the correct role shell → load server data through existing API conventions → add loading/error/empty states → protect navigation and API independently → test direct URL access.

Do not modify payment, capacity, role, token, or check-in logic without transaction/security regression tests.
