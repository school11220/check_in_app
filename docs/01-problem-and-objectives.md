# Problem, objectives, and domain

## Problem

Event operators need a public registration surface and an internal operational surface. Without one system, event details, attendee records, payments, tickets, entry validation, and reporting become disconnected.

## Objective implemented

Publish events → collect attendee registrations → price tickets and apply promos → create/verify payment → issue a tokenized ticket → deliver PDF/QR/email → scan/check in → audit and analyze.

## Domain vocabulary

- **Event:** date, venue, capacity, pricing, schedule, registration configuration.
- **Ticket:** attendee registration and payment/check-in state.
- **Session:** event sub-session with time, speaker, capacity, and registration count.
- **Promo code:** discount rule plus usage records.
- **Check-in log:** immutable-ish operational record with checksum.
- **Organizer assignment:** event IDs associated with a non-admin user.
- **SiteConfig:** singleton public-site settings.
