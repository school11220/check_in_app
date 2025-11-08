# 🎫 Event Ticketing & Check-In SystemThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).



A secure, production-ready ticketing and check-in system built with Next.js 14, TypeScript, Prisma, and Stripe.## Getting Started



## 🚀 FeaturesFirst, run the development server:



- **Ticket Registration**: User-friendly form to register for events```bash

- **Stripe Payment Integration**: Secure ₹200 ticket payments via Stripe Checkoutnpm run dev

- **QR Code Generation**: Automatic QR code generation with HMAC-signed tokens# or

- **Check-In System**: Staff portal to scan and validate ticketsyarn dev

- **Real-time Validation**: Prevents double check-ins and validates payment status# or

- **Security**: HMAC SHA-256 signed tokens for ticket authenticationpnpm dev

# or

## 📋 Prerequisitesbun dev

```

- Node.js 18+ 

- PostgreSQL databaseOpen [http://localhost:3000](http://localhost:3000) with your browser to see the result.

- Stripe account (test mode keys)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## ⚙️ Installation

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

1. **Clone and install dependencies:**

```bash## Learn More

npm install

```To learn more about Next.js, take a look at the following resources:



2. **Set up environment variables:**- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

Copy `.env.example` to `.env` and fill in your credentials:

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

```env

# Database (PostgreSQL connection string)## Deploy on Vercel

DATABASE_URL="postgresql://username:password@localhost:5432/ticketing_db?schema=public"

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

# Stripe Keys (from https://dashboard.stripe.com/test/apikeys)

STRIPE_SECRET_KEY="sk_test_your_key_here"Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

STRIPE_PUBLISHABLE_KEY="pk_test_your_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Security - Generate a strong random 32+ character key
TICKET_SECRET_KEY="change-this-to-a-super-secret-key-minimum-32-characters-long"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. **Generate Prisma Client:**
```bash
npx prisma generate
```

4. **Run database migrations:**
```bash
npx prisma db push
```

5. **Start development server:**
```bash
npm run dev
```

## 🔧 Stripe Webhook Setup

For the payment webhook to work, you need to set up Stripe CLI or configure webhooks in Stripe Dashboard:

### Option 1: Stripe CLI (Development)
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret to your .env file
```

### Option 2: Stripe Dashboard (Production)
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy the signing secret to your `.env` file

## 📖 User Flow

### 1. **Ticket Registration**
- User visits homepage (`/`)
- Fills form with: name, email (optional), phone (optional), eventId
- Clicks "Proceed to Payment"

### 2. **Payment Processing**
- Backend creates pending ticket in database
- Creates Stripe Checkout Session (₹200)
- User redirected to Stripe payment page
- Completes payment

### 3. **Ticket Generation**
- Stripe webhook receives `checkout.session.completed` event
- Backend updates ticket status to "paid"
- Generates HMAC-signed token
- User redirected to ticket page

### 4. **QR Code Display**
- Ticket page shows QR code with signed payload
- QR contains: `{ticketId, token}`
- User can save or screenshot QR code

### 5. **Check-In**
- Staff opens check-in portal (`/checkin`)
- Scans QR code (paste JSON data)
- System validates token and payment status
- Marks ticket as checked in
- Prevents duplicate check-ins

## 🛠️ API Endpoints

### `POST /api/tickets`
Create a new ticket and Stripe checkout session.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "eventId": "EVENT-2025"
}
```

**Response:**
```json
{
  "ticketId": "uuid",
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

### `GET /api/tickets/[id]`
Get ticket details by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "eventId": "EVENT-2025",
  "status": "paid",
  "token": "abc123...",
  "checkedIn": false,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### `POST /api/webhooks/stripe`
Stripe webhook handler for payment confirmation.

**Event:** `checkout.session.completed`

### `POST /api/checkin`
Check in a ticket.

**Request:**
```json
{
  "ticketId": "uuid",
  "token": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in successful",
  "ticket": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "eventId": "EVENT-2025",
    "checkedIn": true
  }
}
```

## 🗃️ Database Schema

```prisma
model Ticket {
  id         String   @id @default(uuid())
  name       String
  email      String?
  phone      String?
  eventId    String
  status     String   @default("pending") // pending | paid | refunded
  token      String?
  checkedIn  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## 🔒 Security Features

1. **HMAC Token Signing**: Tickets signed with SHA-256 HMAC
2. **Timing-Safe Comparison**: Prevents timing attacks
3. **Stripe Webhook Verification**: Validates webhook signatures
4. **Environment Variables**: Sensitive data in `.env` file
5. **Payment Status Check**: Validates payment before check-in
6. **Duplicate Prevention**: One-time check-in enforcement

## 📱 Pages

- `/` - Registration form
- `/ticket/[id]` - Ticket display with QR code
- `/checkin` - Staff check-in portal

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Environment Variables
Set all `.env` variables in your hosting platform:
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TICKET_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

### Database
- Use a managed PostgreSQL service (Neon, Supabase, Railway)
- Run `npx prisma db push` after deployment

## 🧪 Testing

1. Use Stripe test cards: `4242 4242 4242 4242`
2. Test webhook locally with Stripe CLI
3. Generate test tickets and verify QR codes
4. Test check-in flow with valid/invalid tickets

## 📝 Future Enhancements

- [ ] QR code scanner camera integration
- [ ] Email ticket delivery
- [ ] PDF ticket generation
- [ ] Admin dashboard with analytics
- [ ] Multiple event support
- [ ] Ticket refund handling
- [ ] Real-time check-in stats

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ using Next.js 14, TypeScript, Prisma, and Stripe
