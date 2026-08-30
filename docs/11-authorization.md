# Authorization

`ADMIN_ROLES`, `ORGANIZER_ROLES`, and `CHECKIN_ROLES` define role groups. `hasEventAccess()` grants Admin global access and checks `assignedEventIds` for Organizer/Scanner. `authorizeTicketAccess()` allows a valid ticket token, the owning user, or an organizer/admin with event access.

Authorization must be evaluated at every API route. Middleware redirects page requests but deliberately passes `/api` through. Potential bypasses must be tested against direct route calls, especially public-ish email, payment, ticket artifact, transfer, promo validation, analytics, and webhook paths.
