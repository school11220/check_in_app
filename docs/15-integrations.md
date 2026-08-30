# External integrations

| Service | Purpose | Configuration | Failure behavior |
|---|---|---|---|
| Clerk | Identity, org role, webhook sync | Clerk public/secret keys | session/user lookup failure returns null/error; webhook returns 400 |
| Razorpay | Orders, payment fetch, refunds | Razorpay key ID/secret | route returns 4xx/5xx; settlement transaction is guarded |
| SMTP/Gmail | Ticket/certificate email | SMTP or Gmail variables | best-effort warnings/logs; delivery log in relevant paths |
| Upstash Redis | Optional rate limiting | REST URL/token | throttling disabled if missing |
| Fast2SMS | Optional SMS helper | API key | behavior depends on `lib/sms.ts` |
| Vercel | Hosting/deployment | `vercel.json` | provider behavior not locally provable |

No AI, maps, payment webhook, cloud object storage, monitoring vendor, or queue provider was identified.
