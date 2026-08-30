# System architecture

EventHub is a layered modular monolith. Browser pages and client components call same-deployment route handlers. Route handlers resolve identity/roles, validate input, use domain helpers, access Prisma, and call external services. The database is shared by all roles and flows.

```mermaid
flowchart TD
 U[User] --> UI[Next.js page/component]
 UI --> H[Hook/store/API call]
 H --> R[Route handler]
 R --> A[Clerk/session + role check]
 R --> V[Zod/manual validation]
 R --> D[Domain helper]
 D --> P[Prisma]
 P --> DB[(PostgreSQL)]
 R --> X[Razorpay / SMTP / Upstash]
 R --> UI
```

No separate repository or service class layer is consistently present; many route handlers contain orchestration and direct Prisma operations.
