# Database audit

The datasource is PostgreSQL via `POSTGRES_PRISMA_URL`; `lib/prisma.ts` also considers `DATABASE_URL`. The schema defines 15 models: `AuditLog`, `User`, `Event`, `PricingRule`, `Review`, `Session`, `SiteConfig`, `Ticket`, `CheckInLog`, `TicketDeliveryLog`, `SecurityEvent`, `PromoCodeRecord`, `PromoUsage`, and `CertificateTemplate`.

`Event` is the hub. `Ticket` belongs to Event and optionally User. Check-in and delivery logs cascade from Ticket. Pricing rules, Reviews, Sessions, and the optional CertificateTemplate cascade/attach to Event according to the schema. The schema has extensive indexes on event/status/time/access fields. Event schedules, speakers, sponsors, registration fields, site settings, and certificate elements use JSON; tags and assignment/event IDs use PostgreSQL arrays.

The repository uses `prisma db push` in README setup and has a seed script, but no migration directory. Versioned schema rollout is therefore not evidenced.
