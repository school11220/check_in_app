# Feature matrix

| Feature | Entry points | Main implementation | Persistence |
|---|---|---|---|
| Public discovery | `/`, `/discover`, `/event/[id]`, `/p/[slug]` | pages, `HomeClient`, events API | `Event`, `SiteConfig` |
| Event management | `/admin`, `/organizer` | `EventModal`, event routes | `Event` |
| Registration/tickets | `/register`, event pages | `TicketForm`, tickets routes | `Ticket` |
| Razorpay payments | checkout | order/verify routes | Ticket payment fields |
| Promo codes | admin and checkout | promo routes, `pricing.ts` | `PromoCodeRecord`, `PromoUsage` |
| QR ticket access | `/ticket/[id]` | QR/PDF/ICS routes, security helpers | `Ticket` |
| QR check-in | `/checkin` | `QRScanner`, check-in routes | `Ticket`, `CheckInLog` |
| Sessions/slots | admin/organizer tabs | session/slot routes, scheduler | `Session`, Event JSON schedule |
| Attendee import | organizer/admin | import button and route | `Ticket` |
| Analytics | dashboards | analytics components/routes | aggregate queries |
| Reviews | event pages/organizer | `EventReviews`, reviews route | `Review` |
| Certificates | admin/organizer operations | certificate components/generators | `CertificateTemplate`, Ticket flag |
| Email/SMS | ticket/certificate flows | Nodemailer, `sms.ts` | delivery logs where used |
| Audit/security | admin/check-in | audit viewers/routes/helpers | `AuditLog`, `SecurityEvent` |
| PWA/offline | browser install/check-in | next-pwa, manifest, offline hook | client queue |
| Attendee segments | admin/organizer segments tabs | live filter builder and preview API | `AttendeeSegment` plus derived `Ticket` queries |
| Reliable reminders | admin/organizer reminders tabs, protected cron | reminder processor, SMTP/SMS helpers | `ReminderSchedule`, `ReminderDelivery`, `TicketDeliveryLog` |
| Event templates | admin/organizer templates tabs | snapshot and draft-event APIs | `EventTemplate` |

No payments refund lifecycle, storage durability, or email receipt should be claimed beyond the actual route behavior.
