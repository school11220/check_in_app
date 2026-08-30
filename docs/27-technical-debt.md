# Technical debt

Priority 1: establish Prisma migrations and deployment procedure; add route authorization/integration tests; audit public-ish email/ticket/transfer endpoints; strengthen QR digest and rate-limit operational guarantees.

Priority 2: move email/PDF/certificate delivery to durable jobs; standardize `respond()`/Zod usage; centralize ticket settlement and authorization; improve observability and provider timeouts.

Priority 3: normalize heavily queried JSON/array fields where reporting requires it; add E2E, load, and disaster-recovery validation; document actual production topology.
