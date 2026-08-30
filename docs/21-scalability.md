# Scalability

The web layer is mostly stateless and suitable for horizontal deployment, but PostgreSQL remains central. At 10x usage, connection pooling, aggregate queries, payment/email rate limits, and concurrent capacity updates should be measured. At 100x, request-bound document/email generation, absence of queues, single-database dependence, JSON-heavy domain fields, and operational audit volume become bottlenecks. Redis is optional and currently used for throttling, not general caching.
