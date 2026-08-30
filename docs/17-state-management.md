# State management

State is distributed across local component state, shared `lib/store`, route/tab parameters, server/database state, and the offline check-in hook. Ticket lifecycle is persisted in PostgreSQL; UI lifecycle labels are derived by `getTicketLifecycleStatus()`. Event dashboards derive aggregate state from database queries. The server owns authoritative payment, capacity, role, and check-in state; the browser owns transient form, scan feedback, and offline queue state.
