# Reliability

Payment and check-in writes use transactional/conditional patterns. Duplicate payment verification recognizes already-paid tickets. Email is not part of the payment transaction, so delivery failure leaves a paid ticket. No circuit breaker, durable retry queue, idempotency key store, or disaster-recovery procedure is evidenced. Database, Clerk, Razorpay, and SMTP outages should be diagnosed from route logs and provider dashboards; no built-in tracing/alerting layer was found.
