# Configuration inventory

Required: `POSTGRES_PRISMA_URL`, `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

Recommended: `TICKET_SECRET_KEY`, `CRON_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.

Reminder scheduling: `REMINDER_TIMEZONE` defaults to `Asia/Kolkata`, `REMINDER_TIMEZONE_OFFSET_MINUTES` defaults to `330`, and `REMINDER_GRACE_MINUTES` defaults to `60`. Invoke the protected reminder cron every 15 minutes from Vercel Pro or an external scheduler; Vercel Hobby does not support this frequency.

Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SENDER_EMAIL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `FAST2SMS_API_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`.

Secrets are used by auth, database, payments, email, SMS, rate limiting, and ticket HMAC functions. Never log or document actual values.
