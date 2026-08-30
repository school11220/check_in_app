# Technology stack

| Technology | Version/source | Role |
|---|---|---|
| Next.js | `^16.1.1` | App Router, SSR, route handlers, build/deploy |
| React | `^19.2.3` | UI and client interactions |
| TypeScript | `^5` | static typing and build checks |
| Prisma | `^6.19.1` | typed PostgreSQL client/schema |
| PostgreSQL | Prisma datasource | relational source of record |
| Clerk | `@clerk/nextjs ^6.36.9` | identity/session/org role |
| Razorpay | `^2.9.6` | orders, payment lookup, refund integration |
| Nodemailer | `^7.0.12` | SMTP/Gmail delivery |
| Upstash | Redis + ratelimit | optional distributed throttling |
| ZXing | browser/library packages | QR/barcode scanning |
| pdf-lib/jsPDF | packages | ticket/certificate/PDF output |
| Recharts | `^3.6.0` | dashboard charts |
| Tailwind/PostCSS | packages/config | styling |
| next-pwa | `^10.2.9` | production PWA assets |

The repository does not implement an LLM SDK, vector search, queue, tracing, or separate ORM service.
