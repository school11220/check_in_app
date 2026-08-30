# Testing

`npm test` runs `scripts/run-tests.ts` and verifies scan payload formats, ticket HMACs, timed QR validity/tampering, time-slot validation/merge, dynamic/early-bird/promo pricing, amount allocation, API JSON/Zod parsing, and ticket lifecycle financials. `npm run ci` chains test, typecheck, lint, and build.

No dependable coverage percentage, browser E2E suite, database integration suite, security suite, performance benchmark, or Razorpay contract test was identified. Highest-value additions are authorization matrix tests, payment verification/idempotency/concurrency tests, check-in duplicate/offline tests, upload tests, and email failure tests.
