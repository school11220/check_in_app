# Background jobs and async systems

Event reminders use the authenticated `GET /api/cron/reminders` route. `CRON_SECRET` is required. Schedules and each per-ticket/channel attempt are persisted in `ReminderSchedule` and `ReminderDelivery`; a compound unique key prevents duplicate reminder records, processing uses a compare-and-set claim, abandoned claims are recovered after ten minutes, and failed deliveries retry up to three times. Vercel Hobby does not support the required 15-minute schedule, so production must invoke this endpoint from a Pro cron or an external scheduler.

The cron processor currently handles at most 100 due deliveries per invocation. Email, certificate, PDF, and non-reminder delivery remain request-triggered. There is no general-purpose queue, worker process, pub/sub consumer, or dead-letter queue.
