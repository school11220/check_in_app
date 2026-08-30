# Error handling

`ApiError` plus `respond()` standardizes known API failures and hides unexpected details behind a generic 500. Direct route handlers commonly return JSON with route-specific status. Frontend error boundaries provide page/root fallbacks. Payment, email, Clerk, database, and upload paths should be read individually because error transformation is not completely uniform.

Important user-visible cases: validation 400, unauthenticated 401, forbidden 403, missing 404, capacity/order conflict 409, throttling 429, unavailable configuration 500, and best-effort email warnings after successful state changes.
