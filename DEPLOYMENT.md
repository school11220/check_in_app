# Deployment Guide for Vercel

This application is built with Next.js 15, Prisma, and PostgreSQL. It is ready for deployment on Vercel.

## 1. Prerequisites

- A **Vercel** account
- A **GitHub/GitLab/Bitbucket** repository with this code
- A **Gmail** account (with App Password generated)
- A **Razorpay** account (for payments)
- A **Fast2SMS** account (optional, for SMS)
- A **Meta Developer** account (optional, for WhatsApp)

## 2. Environment Variables

Configure the following Environment Variables in your Vercel Project Settings:

### Database (Automatically set if you add Vercel Postgres storage)
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

### Payments (Razorpay)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

### Email (Gmail / SMTP)
- `GMAIL_USER` (Your Gmail address)
- `GMAIL_APP_PASSWORD` (App Password, NOT your login password)
- `SENDER_NAME` (Optional, defaults to EventHub)
- `SENDER_EMAIL` (Optional, defaults to GMAIL_USER)

### Security
- `TICKET_SECRET_KEY` (Generate a random UUID or string)

### App URL
- `NEXT_PUBLIC_APP_URL` (e.g., `https://your-project.vercel.app`)

### Optional Notifications
- `FAST2SMS_API_KEY`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

## 3. Database Setup

1. In Vercel, go to **Storage** and create a new **Postgres** database.
2. Link it to your project. This sets the `POSTGRES_...` variables automatically.
3. To push the initial schema, you can run this locally if you have the connection string, or rely on the build script if configured.
   - **Recommended**: Connect locally to the Vercel DB and run `npx prisma db push`.
   - OR, in Vercel Deployment, adding a Build Command hook: `npx prisma db push && next build` (Use with caution in production).

## 4. Initial Setup

1. Deploy the application.
2. Go to `/admin` to access the dashboard.
3. Default password: `admin123` (Change this in the code `lib/store.tsx` or move to Env var for better security).
4. **Create your first Event**: Go to the "Events" tab.
5. **Polls & Q&A**: Will be available dynamically for each event.

## 5. Troubleshooting

- **"Failed to fetch events"**: Ensure the database is connected and schema is pushed (`npx prisma db push`).
- **Email not sending**: Verify Gmail App Password and User settings. Ensure 2FA is enabled on Gmail to generate an App Password.
