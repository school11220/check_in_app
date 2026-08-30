# Bug and risk audit

No runtime-confirmed application bug was established in this static pass. Possible bugs/risks: public email abuse, truncated QR HMAC, disabled rate limiting without Upstash, upload/storage assumptions, stale role/local-user synchronization, payment/browser retry edge cases, and email delivery gaps. Confirm each with targeted route tests before labeling it a confirmed bug.
