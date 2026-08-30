# Project overview

EventHub is a Next.js event-management platform. It combines public event discovery and registration with role-based administration, ticket payment, QR-ticket delivery, attendee check-in, event scheduling, analytics, exports, reviews, certificates, promo codes, and operational audit records.

The codebase is a single application rather than independently deployed frontend/backend services. The most important domain object is `Event`; tickets, sessions, reviews, pricing rules, certificates, and check-in operations attach to it. PostgreSQL is accessed through Prisma. Clerk supplies authentication and role signals; a local `User` model stores application-facing identity and assignments.

The repository supports a real application shape, but claims about production maturity must remain bounded: no migration directory, AI implementation, background worker, payment webhook, reliable coverage report, or observability stack is present in the checkout.
