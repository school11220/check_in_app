# EventHub - Complete Event Management Platform

> Launch, manage, and scale modern event operations with a ready-to-deploy SaaS codebase built for developers and startups.

## Overview

EventHub is a production-oriented event management SaaS designed to help developers, founders, and agencies launch an event platform without building core infrastructure from scratch. It combines event operations, ticketing, payments, attendee workflows, and role-based management in one downloadable source code package.

This project is built to save significant development time for teams that want to ship faster, validate an idea sooner, or deliver a polished client solution with less engineering overhead. Instead of spending weeks assembling common event features, you can start from a complete foundation and customize it for your brand, business model, or customer requirements.

EventHub is ideal for:

- founders building an event-tech SaaS MVP or commercial platform
- agencies delivering event portals for clients
- developers who want a ready-to-deploy event management base
- startups looking for a faster route to production

## Features

EventHub includes the core functionality expected from a modern event management platform, with enough flexibility to support both internal systems and customer-facing SaaS products.

### Role-Based Access

- Admin and Organizer role separation
- permission-aware workflows for operational control
- clear ownership between platform administration and day-to-day event execution

### Event Creation and Management

- create, update, publish, and manage events from a centralized interface
- organize event details such as title, date, capacity, schedule, and status
- maintain multiple events with streamlined operational visibility

### Ticket Booking System

- end-to-end attendee booking workflow
- ticket generation for confirmed orders
- attendee management and booking records for operational follow-up

### Razorpay Payment Integration

- integrated payment flow using Razorpay
- suitable for test and production payment workflows
- built to support monetized event registrations and paid ticketing models

### Email Ticket Delivery System

- automated ticket delivery via email after successful booking
- improved attendee experience with direct ticket access
- useful for customer communication and post-purchase confirmation

### Venue Management

- manage event venues and location-related information
- organize venue-specific details for smoother planning
- useful for single-location and multi-venue event operations

### Dashboard Analytics

- high-level operational insights for admins and organizers
- track event activity, ticketing status, and platform usage
- helps teams monitor performance and make faster business decisions

### Responsive UI

- optimized for desktop, tablet, and mobile usage
- suitable for admin teams, organizers, and operational staff
- modern interface designed for real-world SaaS deployment

## User Roles

### Admin

Admins have full platform control and can manage the overall system configuration, users, events, analytics, and operational settings. This role is intended for business owners, super admins, platform operators, or internal management teams.

Admin capabilities typically include:

- full access to platform configuration
- user and organizer management
- event oversight across the system
- reporting and dashboard visibility
- business-level operational control

### Organizer

Organizers are responsible for managing event-level workflows without full platform authority. This role is well suited for client teams, event staff, department leads, or individual event managers.

Organizer capabilities typically include:

- creating and managing assigned events
- handling ticketing and attendee workflows
- managing venue-related event information
- monitoring event-specific performance and operations

## Use Cases

EventHub is flexible enough to support multiple business and development scenarios:

- **SaaS startups** building an event booking or event operations platform
- **Client projects** for agencies and freelance developers delivering custom event systems
- **College projects** that need a polished, realistic SaaS-grade architecture and feature set
- **Internal tools** for companies, communities, or institutions managing events in-house

## Tech Stack

EventHub is structured as a modern full-stack web application and can be adapted to different deployment workflows.

- **Frontend:** modern React-based web application interface
- **Backend:** server-side application logic and API layer
- **Database:** relational database for users, events, tickets, and operational records
- **Payments:** Razorpay payment gateway integration

This source code package is designed to be developer-friendly and customization-ready.

## Installation Guide

Follow the steps below to run EventHub locally and prepare it for deployment.

### 1. Clone the project

```bash
git clone https://github.com/shivam/eventhub.git
cd eventhub
```

If you downloaded the source code from Gumroad as an archive, extract it and open the project folder in your terminal.

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project and add the required configuration values.

Example:

```env
POSTGRES_PRISMA_URL=postgresql://username:password@localhost:5432/eventhub
DATABASE_URL=postgresql://username:password@localhost:5432/eventhub
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
TICKET_SECRET_KEY=change-this-secret
```

Depending on your deployment setup, you may also configure additional values for authentication, email delivery, storage, or app URLs.

### 4. Prepare the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the project

```bash
npm run dev
```

The application will start locally in development mode and can then be customized, tested, and prepared for production deployment.

### 6. Backfill existing Clerk users (one-time)

If you enabled local `User` sync via Clerk webhooks and need to import existing users once:

```bash
# Preview only (no DB writes)
npm run backfill:users:dry

# Write users to DB
npm run backfill:users
```

Optional flags:

```bash
npm run backfill:users -- --page-size=100 --max-users=500
```

Required environment variables:

- `CLERK_SECRET_KEY`
- `POSTGRES_PRISMA_URL` (or `DATABASE_URL`)

## Environment Variables

EventHub requires a small set of core environment variables to handle auth, payments, and database connectivity.

```env
POSTGRES_PRISMA_URL=postgresql://username:password@localhost:5432/eventhub
DATABASE_URL=postgresql://username:password@localhost:5432/eventhub
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
TICKET_SECRET_KEY=change-this-secret
```

Recommended usage:

- `POSTGRES_PRISMA_URL` and `DATABASE_URL` for Prisma/database access
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for authentication
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` for Razorpay flows
- `TICKET_SECRET_KEY` for QR/ticket integrity logic

For a complete list (including optional integrations), use `.env.example`.

Keep all production credentials private and never commit them to a public repository.

## Pricing Tiers and Usage Limits

EventHub is distributed under a commercial license with usage rights based on the purchased plan.

### Starter

- 1 Admin
- 2 Organizers
- 5 Events
- personal use

Best for individual developers, learning, testing, and non-commercial usage.

### Growth

- 3 Admins
- 10 Organizers
- unlimited events
- commercial use for a single project

Best for freelancers, agencies, and startups launching one client or business deployment.

### Business

- unlimited admins
- unlimited organizers
- unlimited events
- multi-project usage

Best for agencies, studios, and businesses that want broader commercial usage across multiple deployments.

**Note:** Limits are based on recommended usage and license terms.

## License

EventHub is provided under a commercial license.

You are allowed to use and modify the source code according to your purchased tier, but redistribution, resale, sublicensing, and unauthorized sharing of the original or modified source code are strictly prohibited.

See [LICENSE.txt](/home/shivam/check_in_app/LICENSE.txt) for full terms.

## Support

Support is structured to match the needs of buyers at different stages:

- basic support is available for setup guidance and general usage questions
- priority support is intended for higher-tier customers and commercial buyers

Support covers product usage and implementation guidance, but extensive custom development is not included unless separately agreed.

## Notes

- Razorpay should be configured in test mode before switching to live credentials
- the system is fully customizable for branding, business logic, and deployment needs
- EventHub is delivered as source code, making it suitable for developers who want full control over the product

## Built For Shipping Faster

EventHub is designed to help you skip repetitive setup work and focus on launch, customization, and delivery. Whether you are validating a startup idea, building for a client, or creating an internal platform, this codebase provides a serious head start.

---

Built by Shivam
