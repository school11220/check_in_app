# Background jobs and async systems

No queue, worker process, cron handler, pub/sub consumer, or dead-letter flow was identified. Email, certificate, PDF, and analytics work appears request-triggered. `CRON_SECRET` is listed as recommended configuration, but a cron implementation is not established by the current route inventory. Do not describe delivery as durable asynchronous processing.
