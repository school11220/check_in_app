# Code quality and design patterns

Actual patterns include a Next.js App Router, middleware, compatibility session facade (`getSession`), helper-based API error/validation layer, Prisma data mapper/client, service-like domain helpers, HMAC utility boundary, and transaction-based state transitions. Not every folder is a formal clean-architecture layer; several route handlers directly query Prisma and integrate with providers.

Strengths: strict TypeScript, reusable security/pricing/lifecycle helpers, meaningful indexes, error boundaries, and focused pure-function tests. Debt: duplicated direct route validation/error styles, JSON/array fields for flexible data, request-bound integration work, no migration directory, limited integration tests, and possible auth drift across public-ish routes.
