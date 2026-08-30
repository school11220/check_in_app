# Authentication

Clerk supplies `auth()` session identity. `proxy.ts` runs `clerkMiddleware`, fetches fresh Clerk user data, resolves organization role/public metadata, redirects protected pages, and adds `x-user-role` to allowed responses. `lib/auth.ts:getSession()` first attempts local `User` synchronization, then falls back to Clerk API data, returning a compatibility session object with ID, name, email, role, assigned events, and organization ID.

Clerk user created/updated webhook events upsert local users; deleted events remove local rows. Exact webhook verification uses Clerk's `verifyWebhook`. Password handling is delegated to Clerk; the local `User.password` field exists in schema but is not evidence of an active password-login implementation.

Logout, token refresh internals, OAuth provider configuration, and browser fresh-login behavior are not determinable solely from this repository.
