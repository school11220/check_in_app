# Frontend architecture

Pages are in the App Router. Role surfaces are `/admin`, `/organizer`, and `/checkin`; public/account surfaces include `/`, `/discover`, `/event/[id]`, `/p/[slug]`, `/register`, `/ticket`, `/me`, and auth pages. Feature components include event/ticket forms, dashboards, analytics, admin managers, attendee lists, QR scanning, and error/loading states.

State is a mixture of local React state, shared `lib/store`, URL route/tab state, and server data fetched by components. `hooks/useOfflineCheckin.ts` supports a client queue; its persistence and synchronization should be read alongside the hook before changing scanner behavior. Loading and error boundaries are implemented in `app/loading.tsx`, `app/error.tsx`, `app/global-error.tsx`, and `components/ErrorState.tsx`.

Frontend role checks improve UX but do not replace API authorization.
