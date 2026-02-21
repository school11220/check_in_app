STITCH UI SPEC

Overview
- Purpose: A stitch-ready, detailed UI spec describing pages, layouts, components, buttons, micro-interactions, animations, accessibility states, responsive rules, and assets for the entire `check_in_app` project. Use this as the single-file prompt to Stitch (or any AI design tool) to generate screens and design tokens.
- Audience: Designers and AI design tools (Stitch / Figma export)
- Output formats suggested: high-fidelity frames for desktop and mobile, component library (Figma components), and JSON tokens.

Design Tokens (recommendation)
- Color Palette:
  - Primary: #6F4CE3 (deep violet) — used for primary CTA, active nav, subtle glows
  - Accent: #FF66C4 (pink accent) — use for highlights, badges, live indicators
  - Success: #12B886 (green) — check-ins success, success badges
  - Warning: #FFB020 (amber) — alerts, attention
  - Error: #EF4444 (red) — validation errors
  - Surface / Backgrounds:
    - bg-900: #0b0b0f (main dark background)
    - bg-800: #111119 (cards, surfaces)
    - bg-700: #15151b (secondary surfaces)
  - Text:
    - text-primary: #E6E7EB
    - text-secondary: #A6A7AD
    - text-muted: #7A7B80
- Typography:
  - System stack with variable weights. Sizes (desktop): 16px base, 20px (lead), 24px (heading), 32px (h1), 40px (hero)
  - Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Spacing scale (8px grid): 4, 8, 12, 16, 24, 32, 40, 56, 72
- Radii: 4px (chips), 8px (cards), 14px (modal), 9999px (pill)
- Shadows:
  - elevation-1: 0 4px 12px rgba(0,0,0,0.35)
  - elevation-2: 0 10px 30px rgba(0,0,0,0.5)
- Motion tokens:
  - Ease standard: cubic-bezier(0.2, 0.8, 0.2, 1)
  - Ease soft: cubic-bezier(0.22, 1, 0.36, 1)
  - Duration micro: 120ms
  - Duration short: 200ms
  - Duration medium: 350ms
  - Duration long: 500ms

Responsive breakpoints
- Mobile: 0–639px
- Tablet: 640–1023px
- Desktop: 1024px+
- Layout rules: single-column mobile, two-column tablet, left nav + main content desktop

Global UI Patterns
- App chrome:
  - Left navigation (collapsible) on desktop with icons + label. Collapsed shows icons only.
  - Top header: left: search / breadcrumbs; center: event title; right: quick actions (profile/avatar, theme toggle, notifications)
  - Floating action button (FAB): bottom-right for quick check-in creation (primary accent). On small screens, a smaller FAB stacked above the bottom safe-area.
  - Toaster: top-right or top-center; appear with slide-down + fade and auto-dismiss (4s), swipable on mobile.
- Card pattern:
  - Surface bg-800, 12px padding, 8px border-radius.
  - Hover: elevation-1 + translateY(-4px) with short duration.
- Buttons:
  - Primary: filled with Primary color, white text, 12px vertical padding, 16px horizontal padding, radius 8px.
  - Secondary: outline with 1px border, transparent background, text-primary.
  - Ghost: no border, subtle text color.
  - Icon buttons: circular 36px; center icon; hover glow + background tint.
- Forms:
  - Inputs: bg-700, border 1px solid transparent, focus ring using Primary color 2px, label above field.
  - Validation: inline below input, color Error.
- Lists & Tables:
  - Alternating subtle surface tints for rows; rows have actions on hover (ellipsis menu or inline icons).
- Empty / Loading states:
  - Skeleton shimmer: linear-gradient moving from left to right; base color bg-700; highlight bg-800; duration 1200ms loop.

Pages (page-by-page detailed descriptions)
Note: For each page produce both Desktop and Mobile layouts as described.

1) Home / Landing (`app/page.tsx`)
- Layout: Centered content with hero area showing upcoming events, quick actions cards below, and right-side summary on desktop.
- Hero: large event search / event creation CTA. Background subtle gradient or dark surface card.
- Cards: "Create event", "Scan QR", "Manage tickets" with large icon, small description, and CTA.
- Interactions: hovering a card raises it (translateY -6px) and shows inline arrow CTA.
- Mobile: stacked cards, large touch targets.

2) Admin Dashboard (`app/admin/page.tsx`)
- Layout: left nav (admin sections), top filter bar, main content with grid of widgets: attendee insights, poll summary, revenue, latest check-ins.
- Widgets: small cards with charts or sparklines. Hover shows actions (Export, View).
- Modal flows: for editing settings or sending announcements — modal: center, 640px width on desktop, full screen sheet on mobile.
- Notifications: small badge on bell icon, pulsing micro-animation when new.

3) Event page (`app/event/[id]/page.tsx`)
- Header: event title large, date/time, host name. Quick actions: "Open check-ins", "Tickets", "Export".
- Main layout (desktop): left column event overview (description, venue map, schedule), middle column real-time feed/check-in panel, right column attendees + tickets.
- Real-time feed (LiveCheckInFeed): list of latest check-ins with avatar, name, ticket type, check-in time, small status dot. New check-ins are inserted at top with subtle highlight pulse (accent -> fade)
- PhotoWall: grid of user-uploaded photos, clickable to open gallery modal.
- Mobile: stacked sections, a sticky bottom bar for quick check-in or scan.

4) Check-in page (`app/checkin/page.tsx`)
- Purpose: core flow for scanning QR or searching attendees to check them in.
- Layout: large search input at top; central scanner area or manual search list below.
- QRScanner component: full-bleed scanner box with overlay framing, cancel button top-left, flashlight toggle in bottom toolbar (mobile), result card slides up when a match found.
- Scanner interactions: scanning success -> green check animation (scale + ring) and a success toast.
- Manual check-in: search results list with inline actions: "Check-in" (primary), "View ticket" (secondary).
- Error states: invalid QR shows error card with retry button.

5) Ticket page (`app/ticket/[id]/page.tsx`)
- Layout: ticket preview card with attendee details, QR code area, status (checked-in or not), action buttons: "Resend ticket", "Download PDF", "Mark as used".
- Visual: ticket background pattern, prominent QR area, expiration or fraud flags in red.
- PDF download: shows small progress indicator and success toast.

6) Scanner page (`app/scanner/page.tsx`)
- Full-screen scanner view for hand-held devices.
- Top small help text and bottom toolbar: toggle camera, flashlight, manual search shortcut.
- Micro interactions: scanner reticle pulses softly while scanning; when face recognized/QR recognized, area briefly glows.

7) Login / Register / Sign-up (`app/login/page.tsx`, `app/register/page.tsx`, `app/sign-up/[[...sign-up]]/`)
- Form-centered layout on desktop with side illustration; mobile: stacked form, full width.
- Buttons: primary action for submit, ghost for social logins.
- Password strength indicator: color-coded bar and inline suggestions.
- SSO flow: success -> slide up notification and redirect; failure -> inline alert with retry.

8) Organizer page (`app/organizer/page.tsx`)
- Organizer profile, list of managed events, analytics snapshot.
- Buttons: "Create event", "Invite organizers".
- Cards: event tiles with small KPI chips (attendees, revenue, check-ins).

9) Pages for `p/[slug]` (public event page)
- Public-facing event landing: hero image, date/time, CTA to buy ticket or register. Responsive hero image with overlay.
- Sections: About, Schedule, Hosts, Tickets, FAQ.
- CTA sticky on mobile (Buy / Register) — prominent primary color, fluid width.

10) Admin Tools & Utility pages (under `app/admin/*` + `components/admin/*`)
- AuditLogViewer — table view with filters, time-range selector, ellipsis actions per row.
- CertificateManager — list of generated certificates, preview modal, dropdown to download or resend.
- PollManager (AdminPollManager) — list of polls with create/edit interface: modal editor with question, options, visibility settings. Live results shown on right.

11) Surveys & Forms (`app/survey/[id]/page.tsx`)
- Multi-step form UI with progress indicator at top (step numbers + labels), next/previous actions. Smooth step transition sliding horizontally.
- Field validation: inline messages, disabled next until required fields valid.

12) Notifications & Toaster
- Toasts appear top-right with slide+fade; contain short message, icon, optional action link.
- Persistent banners for important messages appear above main content (full width card, dismissible).

13) Photos / Uploads
- Upload UI: drag-and-drop area with dashed border, large upload button, thumbnail grid preview.
- Upload progress overlay on thumbnails with circular progress and cancel.

14) Tickets management / ticket-email, ticket-storage
- Ticket list: search, filters (status), bulk actions (resend, export). Bulk action bar appears when items selected.

Components (folder-level mapping & detailed behaviors)
- `AnnouncementBar`:
  - Full-width slim bar at top (below header) for announcements. Contains dismiss X. Animate in with slide-down and subtle bounce.
- `AttendeeInsights`:
  - Card with summarized KPIs, donut/sparkline. Hover reveals timeframe filter.
- `Breadcrumbs`:
  - Horizontal small links, chevron separators, last item bold.
- `CountdownTimer`:
  - Compact pill showing days/hours/mins, subtle pulsing when <24h left.
- `EventModal`:
  - Centered modal with 14px radius, shadow, header with title, footer with primary + secondary actions. Enter/exit scale + fade.
- `EventPolls`, `LivePollQA`:
  - Poll list with live vote counts; real-time bar animation when counts change; transitions should animate bar width smoothly.
- `HomeClient`:
  - Client-facing home widgets; use a responsive grid.
- `LiveCheckInFeed`:
  - Live list with newest on top; animate insert with slide-down + fade. Use green highlight pulse for successful check-ins.
- `QRScanner`:
  - Overlay with translucent mask, rounded rect cut-out, animated scanning line (horizontal) with glow and short duration loop.
- `QuickActionsFAB`:
  - Circular 56px button with prominent icon; pressed scale to 0.95; show expanded speed-dial on long-press or click (small radial menu with options).
- `Skeleton`:
  - Reusable skeleton blocks: text line, avatar circle, card placeholder. Use shimmer animation.
- `SurveyForm`:
  - Styled inputs, stepper, button group; confirm modal on submit with summary.
- `ThemeToggle`:
  - Small pill switch with animated sun/moon icon; toggle animates background color and icon transform.
- `TicketForm`, `TicketActions`:
  - Form for ticket creation/edit: multi-field with inline price preview. Actions: Edit, Refund, Download.
- `Toaster`:
  - Reusable; supports info/success/error; supports manual dismiss and actions.

Micro-interactions and animation rules
- Hover states: 1.04x scale on small icon buttons with 120ms; for cards translateY -6px + shadow increase in 200ms.
- Press states: 0.96x scale, opacity 0.9, micro-duration 120ms.
- Insertions: slide + fade with duration 250–350ms and ease standard.
- Remove/dismiss: fade + translateY(8px), duration 200ms.
- Notifications pulse: 2 pulses over 1.2s when first appearing.
- Scanner line: linear 1.2s infinite.
- Poll bars / counters: animate width/number change over 350ms ease soft.

Accessibility (A11y)
- All interactive elements keyboard-focusable; focus ring: 3px outline in Primary color at 2px offset.
- Contrast: ensure text-primary on bg-800 passes WCAG AA.
- Labels: form inputs must include aria-label or visible label.
- Motion preference: if user prefers-reduced-motion, reduce or eliminate non-essential animation (no parallax, no shimmer).

Interaction states and edge cases
- Offline mode: show persistent yellow banner "Offline — changes will sync when you reconnect". Provide retry/sync button.
- Conflicting check-in: when duplicate/possible fraud, show modal with bold warning and action choices: Confirm/Cancel.
- Bulk actions feedback: show progress bar + per-item status chips.
- Rate limiting or server error: show full-width error banner with retry.

Iconography and asset guidance
- Use simple geometric icons (outline style) for nav and actions; filled icons for primary CTA.
- Avatar fallback: user initials in circular bg with pastel color from token set.
- QR & barcode assets: high-contrast monochrome QR code card with subtle drop-shadow.

Export & Stitch prompt guidance
- Suggest exporting for two resolutions: 1440px (desktop) and 390px (mobile).
- Provide component tokens (color, spacing, typographic) as JSON when prompting Stitch. Include motion tokens for micro-interactions.
- For each page, request: "Hero, header, main content, secondary panels, and floating actions" frames.
- Component library export: Buttons, Inputs, Cards, Modals, FAB, Scanner overlay, Toaster, Skeletons, Polls, Ticket tile.

Deliverables (what Stitch should produce)
- Desktop and Mobile artboards for every page listed above.
- Figma component library with named tokens and variants (Button: primary/secondary/ghost, Card: default/hover, Modal: default/confirmation).
- JSON tokens file for colors, spacing, typography, radii, shadows, and motion.
- Interaction spec: one-liners for each micro-interaction (hover, pressed, loading, insert) with durations/easing.

File references (where UI pieces are sourced from project)
- Pages: app/page.tsx, app/admin/page.tsx, app/checkin/page.tsx, app/event/[id]/page.tsx, app/login/page.tsx, app/organizer/page.tsx, app/p/[slug]/page.tsx, app/register/page.tsx, app/scanner/page.tsx, app/sign-up/..., app/survey/[id], app/ticket/[id], app/unauthorized/page.tsx
- Components: components/* (EventPolls, QRScanner, PhotoWall, TicketForm, QuickActionsFAB, LiveCheckInFeed, Toaster, Skeleton, ThemeToggle, AnnouncementBar, PollManager)
- Lib: lib/* for logic & token use (e.g., qr-generator, qr-security) — used for spec notes about QR placement and security badges.

How to use this spec with Stitch
- Feed this entire file to Stitch with request: "Generate app designs for dark theme and accessible variant. Create Figma file with components and tokens as specified." Add sample data: event title, sample attendee names, 10 recent check-ins, ticket types.
- Ask Stitch to create component variants and name them exactly as the tokens above so developers can map CSS/Tailwind tokens back to design tokens.

Notes and assumptions
- The app uses a dark-themed UI; tokens above assume dark surfaces.
- Some components will have multiple states (loading, empty, success, error) — generate variants for each.
- Animation intensity and durations are conservative for a professional admin-facing app.

Next steps (optional)
- Produce a JSON tokens file mapping the colors/spacing/motion tokens above.
- Produce a minimal sample dataset (events, attendees) to seed the design frames.

---

End of spec. If you want, I can also:
- produce a JSON token file next, or
- export a concise Stitch prompt (single-paragraph) that contains the essentials of this spec for quick ingestion.


Remaining app pages — detailed UI descriptions
Note: the following covers every `page.tsx` and UX-facing route under `app/` found in the repository. Use these to produce frames for Desktop (1440px) and Mobile (390px).

`app/layout.tsx` (Global layout)
- Purpose: app chrome used by all pages. Includes left navigation, top header, main content container and global toasts.
- Desktop: left nav (240px) with icons + labels; collapsible to 72px showing icons only. Top header spans remaining width with search on left, centered context title, right-side profile / notifications / theme toggle.
- Mobile: left nav hidden behind hamburger; top header compact with back control and short title; bottom safe-area handled for FABs.
- States & interactions: collapsed nav expands on hover after 120ms; keyboard focus highlights nav items; avatar menu opens small dropdown with account, settings, and sign out. Global modals centered; sheet style for mobile.

`app/login/page.tsx` (Login)
- Layout: centered card with app logo above, email + password fields, primary sign-in button, social SSO buttons row below, "Forgot password" link.
- States: inline field validation, loading spinner inside primary button on submit, error banner above card for auth failure.
- Micro-interactions: inputs have subtle lift on focus, password show/hide icon toggles visibility with transform.

`app/register/page.tsx` (Register)
- Layout: two-column on desktop (form + illustration), single column on mobile. Fields: name, email, password, organization (optional), promo code.
- CTA: primary "Create account"; secondary link to `Login`.
- Validation: password strength meter, email availability inline check, terms checkbox required.

`app/sign-up/[[...sign-up]]/page.tsx` (Sign-up / deep-link flows)
- Purpose: handles magic links, invite tokens, and optional onboarding parameters (multi-step).
- Layout: progressive onboarding wizard: stepper with 2–4 steps (account, org, payment if required, finish). Each step appears as card with primary and secondary actions.
- Mobile: full-screen stepper and bottom fixed action bar.
- Transitions: horizontal slide between steps; show success summary at end with large hero check.

`app/sso-callback/page.tsx` (SSO callback)
- Purpose: temporary redirect/processing UI after third-party SSO (OAuth). Not interactive for long.
- Layout: centered loader card with small message: "Signing you in..." and spinner. On success show a subtle check and slide to destination. On error show dismissible error with retry link.

`app/unauthorized/page.tsx` (Unauthorized / permission error)
- Layout: full-bleed centered error card with headline "Unauthorized" or "Access denied", explanatory text, primary action to `Login`, secondary action to go back or contact support.
- Visuals: muted error illustration (line art) with subtle red accent. Keyboard-focusable CTAs.

`app/event/[id]/opengraph-image.tsx` (OG image generator)
- Purpose: server-rendered image for social previews. Design notes for Stitch: create a bold, landscape artboard with event title, date, organizer, and subtle gradient background using Primary and Accent tokens. Ensure legible white text and large type.

`app/ticket/[id]/page.tsx` (Ticket details)
- (Covered earlier) Add variants: redeemed/used, refunded, pending delivery. For each variant change status chip color and show contextual CTAs (Resend / Refund / Mark used).

`app/scanner/page.tsx` (Scanner full-screen)
- (Covered earlier) Add accessibility: provide manual entry fallback, large touch targets, and camera permission error state with CTA to open settings.

`app/survey/[id]/page.tsx` (Survey view)
- Layout: survey title header, progress indicator, question card area. For question types (single choice, multi-select, text, rating) provide component variants and mobile-friendly spacing.
- Interactions: answer selection animates check; next button disabled until required answered; final confirmation modal on submit.

`app/p/[slug]/page.tsx` (Public event landing page)
- (Covered earlier) Add ticket purchase microflow: ticket selector drawer (slide up) with seat/ticket type chips, quantity stepper, CTA sticky to bottom on mobile. Payment confirmation modal and success screen with ticket download CTA.

`app/organizer/page.tsx` (Organizer hub)
- (Covered earlier) Add organizer-switcher: small dropdown in header that animates open; quick summary cards for top events with inline actions (Open, Edit, Reports).

`app/admin/page.tsx` (Admin landing)
- (Covered earlier) Add default empty state: "No data" card with CTA to create/import demo data. Admin filters appear as chips under header with clear-all button.

`app/page.tsx` (Root/home)
- (Covered earlier) Add onboarding empty-state suggestions for first-time users: "Create your first event" hero with primary CTA and short checklist.

Extra generic/error pages (recommended even if not present)
- `404` Not Found: large friendly illustration, headline, short description, primary CTA to Home, secondary search input. Animate CTA hover with 1.04x scale.
- `500` Server Error: concise headline, retry button, contact support link, and optional debug details collapse for admins.
- `Offline` / `Maintenance`: full-width banner or full-screen placeholder with retry and ETA where applicable. Show subtle pulsing amber icon.

Notes about non-UI routes
- `app/robots.ts` and `app/sitemap.ts` are server outputs and don't need design frames, but ensure the public landing (`p/[slug]`) OG images and meta use the OG image styles above.

End of remaining pages section.
