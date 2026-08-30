# Repository structure

`app/` is the runtime route/page tree. `components/` contains reusable UI and feature panels. `lib/` contains persistence, auth, domain calculations, security, integrations, and export helpers. `hooks/` contains browser behavior. `prisma/schema.prisma` defines the database. `scripts/` contains tests, environment checks, data backfills, inserts, inspection, and reconciliation. `public/` contains static assets, sounds, PWA manifest/service worker, and images. `proxy.ts` is the Clerk middleware entry point. `next.config.ts` enables PWA and permissive remote image patterns. `vercel.json` declares Next/Vercel and region.

Generated dependency directories are excluded from the conceptual audit. There is no `docs/` content before this analysis and no Prisma migrations directory in the checkout.
