FEATURE MATRIX — exhaustive UI features, links, tabs, buttons, redirects, and data fields

This document lists every interactive element, tab, link, API action, and data field per page or admin/organizer area so Stitch can render accurate flows and screen variants. Use this as the canonical checklist for component and state variants.

Global / App chrome
- Left nav (links & behavior)
  - Home: redirects to `/` (app/page.tsx)
  - Events: `/admin/events` (admin list) — sub-links: Create Event, Import Events
  - Check-ins: `/admin/checkins` — sub-links: Live feed, Audit log, Bulk check-in
  - Tickets: `/admin/tickets` — sub-links: All tickets, Refunds, Transfers
  - Analytics: `/admin/analytics` — sub-links: Overview, Event reports, Exports
  - Photos: `/admin/photos` — sub-links: Photo wall, Approvals
  - Polls: `/admin/polls` — sub-links: Create poll, Live polls
  - Sessions: `/admin/sessions` — sub-links: Manage sessions, Add session
  - Settings: `/admin/settings` — sub-links: Integrations, Team, Billing
  - Notifications: `/admin/notifications` — sub-links: Compose, Templates
  - Promo: `/admin/promo` — sub-links: Validate code, Create promo
  - Integrations: `/admin/integrations` — PhonePe, Razorpay, Google/Clerk etc.
  - Uploads / Export: `/admin/export`, `/admin/upload`
  - Each left-nav item: icon, label, optional badge (count), tooltip on collapse; keyboard shortcut listed in tooltip where applicable.

Top header (global actions)
- Search: global quick-search (press "/" to focus). Autocomplete returns events, attendees, tickets; results link to event page, ticket page or attendee profile.
- Context title: shows current page or selected event name — clicking opens quick event switcher (modal/dropdown).
- Quick actions:
  - Create event (primary) -> open `EventModal` -> POST to `/api/events`
  - New ticket -> open `TicketForm` -> POST `/api/tickets`
  - Quick scan -> navigates to `/scanner`
  - Notifications icon -> opens notifications panel, each item links to related resource
  - Profile avatar -> dropdown: Account, Team, Billing, Logout (redirects to `/api/auth/logout`)

Home (`app/page.tsx`) — features & links
- Hero CTAs:
  - Create event -> opens `EventModal` (same as admin Create event) -> redirects to new event `/event/[id]` on success
  - Scan QR -> `/scanner`
  - Manage tickets -> `/admin/tickets`
- Sections & links:
  - Upcoming events list: each tile opens `/event/[id]` and has a small menu with Edit, Duplicate, Publish/Unpublish, View public page (`/p/[slug]`)
  - Recent check-ins preview -> click to open Live feed on event page
  - Onboarding checklist links to `register` or `create event` flows

Admin — landing and full-admin features (collective)
- Admin tabs for each event (when viewing an `event/[id]` as admin):
  - Overview: high-level KPIs, quick links to Actions
  - Attendees: table with filters and columns
    - Columns: checkbox, avatar, name, email, phone, ticket type, ticket id, purchased at, check-in status (chip), actions (View ticket, Edit attendee, Send email)
    - Bulk actions top bar: Export CSV, Resend tickets, Send email, Mark checked-in, Refund
  - Check-ins: Live feed + Audit log
    - Live feed: auto-updating list, filter by ticket type, manual search, device filter (scanner id)
    - Audit log: columns: time, actor (scanner/user), action type, ticket id, notes, export button
  - Tickets: list & manager
    - Columns: checkbox, ticket id, type, price, purchaser, status (draft/issued/refunded/used), actions (Resend, Download PDF, Refund, Transfer)
    - Ticket filters: status, type, date range, purchaser email
  - Sessions (if event has sessions): session list with time, capacity, assigned tickets
  - Polls: list of polls for event with actions: View results, Edit, Close poll
  - Photos: moderation queue, approve/reject, bulk approve, export
  - Settings: event settings (visibility, capacity, permissions), integrations, webhooks
  - Export: generate exports (attendees, check-ins, tickets), export format dropdown (CSV, XLSX), progress toast and download
- Admin Actions & modals:
  - Create Event: full form modal -> fields: title, slug, description, venue (address + map pin), time (start/end), timezone, organizers, tickets (ticket types nested), capacity, visibility (public/private), image upload
  - Edit Event: same modal prefilled
  - Publish/Unpublish: confirmation modal with consequences
  - Delete Event: destructive modal with typed confirmation
  - Import Events: CSV upload modal with mapping UI

Event (`app/event/[id]/page.tsx`) — per-event features and tabs
- Header actions:
  - Open check-ins -> opens check-in panel or `/checkin?event=[id]`
  - Tickets -> `/event/[id]/tickets` or modal ticket manager
  - Export -> open export modal -> export attendees/tickets/check-ins
  - Share -> open share modal with public URL `/p/[slug]`, social share links, copy link
  - Edit -> open event edit modal
- Event page tabs (left-to-right):
  - Overview (default): event details, KPI cards (attendees, check-ins, revenue, conversion)
  - Attendees: attendee list with filters and columns (see Admin Attendees)
  - Check-ins: live feed + quick-check tools (Undo last check-in, Mark no-show)
  - Tickets: ticket types grid with sold/available counters; actions: Add ticket, Edit price rules
  - Polls & Q&A: list of active polls, create poll button, live results
  - Photos: photo wall, moderation toggle
  - Settings: event-level settings (checkout flow, refund policy, variant fields)
- Inline links:
  - Each attendee -> `/ticket/[id]` or attendee quick profile modal
  - Each poll -> open poll detail modal

Check-in (`app/checkin/page.tsx`) — detailed modes & controls
- Primary modes (tabs or segmented control): Scanner, Manual, Bulk
  - Scanner:
    - Camera view with overlay; actions: toggle torch, switch camera (front/back), pause/resume scanning
    - Quick manual entry button -> opens manual search modal
    - Recent scans history panel togglable from right
    - On successful scan: show result card with attendee details, primary "Check-in" button (green), secondary "View ticket" (ghost)
  - Manual:
    - Search input with debounce; results show attendee cards with actions (Check-in, View ticket, Add note)
  - Bulk:
    - Upload CSV template link; drop area; preview mapping modal; start import; progress indicator; row-level error handling
- Check-in micro-actions:
  - Undo last action (toast with Undo button)
  - Force check-in (when duplicate) shows fraud warning modal
  - Batch check-out (if needed): select attendees -> Check-out

Ticket details (`app/ticket/[id]/page.tsx`) — interactions
- Action buttons:
  - Resend ticket -> triggers `/api/tickets/[id]/deliver` -> toast on success
  - Download PDF -> GET `/api/tickets/[id]/pdf` (show progress)
  - Mark as used / Mark as refunded -> state change with confirmation modal
  - Transfer ticket -> opens modal to enter recipient email -> call `/api/tickets/transfer`
  - Refund -> open refund modal with partial/complete refund options -> POST `/api/tickets/refund`
- Ticket card fields/data shown:
  - Ticket id, purchaser name/email, assigned attendee (if any), price breakdown, fees, purchase date, payment method, QR image, status chip

Scanner (`app/scanner/page.tsx`) — controls & panels
- Toolbar controls (top/bottom depending on layout):
  - Back -> return to previous page
  - Camera: toggle front/back
  - Torch toggle (flashlight)
  - Manual entry -> opens manual check-in modal
  - Batch mode toggle -> allows multiple scans to be queued
  - Scanner device ID (for admin) -> opens device assignment modal
- Settings & errors:
  - Camera permission denied: show help card with CTA to open browser settings
  - Low-light guidance: show overlay instructing to enable torch

Organizer (`app/organizer/page.tsx`) — tabs & actions
- Organizer top-level tabs:
  - Events (list): Cards with Edit / Open / Analytics
  - Team: list of collaborators with role chips (Owner, Admin, Collaborator); actions: Invite, Remove, Change role
  - Billing: invoices, payment method, subscription status; CTA: Update card, View invoices
  - Integrations: connect/disconnect PhonePe/Razorpay, API keys, webhooks
  - Settings: organization settings, branding, default policies
- Quick actions:
  - Create event -> `Create Event` modal
  - Invite organizer -> opens invite modal (email input + role select)

Public event page (`app/p/[slug]/page.tsx`) — purchase flow
- Header CTAs:
  - Buy Tickets -> open ticket drawer
  - Register / RSVP -> opens registration form (if free)
  - Share -> social links / copy link
- Ticket purchase drawer contents:
  - Ticket type selector (chips), quantity stepper, price summary, promo code input (validate via `/api/promo/validate`), checkout button leading to payment provider flow (Razorpay/PhonePe)
  - On payment success: show success screen with ticket download and "Add to wallet" links
  - On payment failure: inline retry and Contact support link

Surveys (`app/survey/[id]/page.tsx`) — features
- Question navigation: progress bar, previous/next, skip, save draft
- Question types: radio, checkbox, textarea, rating, file upload
- Submission: POST `/api/surveys/submit` -> success modal + redirect to thank-you or event page

Login / Register / Sign-up flows — links & redirects
- Login success: redirects to last-intended page (stored in session) or `/` by default
- Social SSO: redirect to `sso-callback` during flow
- Forgot password: link opens password-reset flow (email send) -> `/api/auth/reset`

Notifications & Toaster actions
- Notification items link to: event, ticket, attendee, export result, or external link
- Toast actions: Undo, View, Open export — each links to a specific route or executes an API call

Photos / Uploads features
- Photo uploader: drag-drop or select files; show thumbnail previews; per-photo caption input; bulk approve/reject for admins
- Photo gallery: masonry grid, click to open lightbox with navigation and download button

Tickets management features (admin)
- Pricing rules manager: create/edit rules (early-bird, promo, capacity-based). Actions: Preview price, Activate/Deactivate, Duplicate
- Ticket types editor: create bundle, add metadata fields (name, description, limit, visibility)

Admin integrations & payments
- PhonePe integration: connect flow in Integrations; buttons to Test Payment, Verify callback (`/api/phonepe/callback` flow), View transaction log
- Razorpay integration: create order endpoint (`/api/razorpay/order`), verify (`/api/razorpay/verify`), UI shows payment status and capture/refund actions

Export, Reporting & Data actions
- Export modal: choose dataset (attendees, checkins, tickets), columns, date range, file type, include QR codes option
- Scheduled exports: create export schedule, email delivery, view history

Audit / Admin logs
- Audit log filters: user, action type, date range, event id
- Each log row: actor, timestamp, action summary, link to resource

Edge-cases & error flows (UI)
- Rate-limited action: show retry-after in banner and disabled action button
- Partial import errors: show CSV row preview with errors and allow fixing inline
- Offline edits: queue changes visually and show sync progress when back online

Data model fields (for design rendering & table columns)
- Event: id, title, slug, startAt, endAt, timezone, venueName, address, lat, lng, capacity, status, organizerIds, imageUrl, description, createdAt
- Ticket: id, eventId, type, price, fees, status, purchaserName, purchaserEmail, assignedTo (attendeeId), qrData, createdAt
- Attendee: id, name, email, phone, ticketId, checkedInAt, checkedInBy, notes, photoUrl
- CheckIn: id, eventId, ticketId, attendeeId, time, deviceId, method (scan/manual/bulk), result
- Poll: id, eventId, question, options[], votes[], visibility
- Photo: id, eventId, uploaderId, url, caption, approved, uploadedAt

Links mapping (common redirects)
- Create event -> POST `/api/events` -> on success redirect `/event/[id]`
- Buy ticket -> payment provider redirect -> payment callback -> on success redirect `/ticket/[id]` or show success modal
- Resend ticket -> POST `/api/tickets/deliver` -> toast
- Export -> POST `/api/export` -> returns job id -> poll `/api/export/[jobId]` -> download link

Admin tabs summary (compact checklist)
- Dashboard / Overview
- Events (list + create/import)
- Attendees
- Check-ins (Live + Audit)
- Tickets (manage, refund, transfer)
- Sessions
- Polls & Q&A
- Photos
- Analytics / Reports / Exports
- Integrations
- Notifications
- Settings / Team / Billing

End of feature matrix.

Next steps (I can do now)
- generate a JSON tokens file (colors, spacing, motion) to feed Stitch, or
- produce a single compact Stitch prompt that copies the essential pages, components and this feature matrix into one ingestible paragraph.
