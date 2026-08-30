# Security audit

## Positive controls

Clerk identity, role checks, Zod validation helpers, HMAC ticket tokens, timing-safe comparisons, signed timed QR payloads, audit checksums, payment signature verification, and optional Redis-backed rate limiting are implemented.

## Findings requiring remediation or verification

1. Review `app/api/email/send/route.ts` and `app/api/email/send-certificate/route.ts` for caller authorization, recipient control, and rate limits.
2. Replace the 16-hex-character truncated timed-QR HMAC with a full-length digest or document an explicitly accepted threat model.
3. Ensure `TICKET_SECRET_KEY` is strong, unique, and present in production; never rely on the deterministic development fallback outside local development.
4. Configure Upstash for public-sensitive rate-limited flows; missing variables disable the control.
5. Audit upload type/size/content validation and storage access in `app/api/upload/route.ts`.
6. Verify transfer authorization and replay behavior in `app/api/tickets/transfer/route.ts`.
7. Treat logs and JSON details as potentially sensitive; review `AuditLog`, `SecurityEvent`, and delivery errors.

No secrets were printed. No confirmed exploit was claimed without reproduction.
