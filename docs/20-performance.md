# Performance audit

Useful indexes exist on event/status/time, ticket lookup, audit, and log access paths. Ticket settlement uses targeted selects and transactions; recent history indicates attention to avoiding full event reads. Likely risks are dashboard aggregates, large exports/imports, email/PDF generation inside requests, JSON field querying, and repeated Clerk API lookups in middleware/session creation. No benchmarks or bundle report are present; do not invent latency or throughput numbers.
