# 🚀 Quick Start Guide

## Step 1: Environment Setup

Update your `.env` file with the following:

### 1. Database (PostgreSQL)
The project is configured with a local Prisma Postgres database. You can:
- **Keep the existing DATABASE_URL** (Prisma local DB), or
- **Use your own PostgreSQL database**:
  ```
  DATABASE_URL="postgresql://username:password@localhost:5432/ticketing_db"
  ```

### 2. Stripe Setup
Get your test API keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys):

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Generate Secret Key
Generate a secure random key for ticket signing:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add to `.env`:
```env
TICKET_SECRET_KEY="your-generated-key-here"
```

### 4. Webhook Secret (Important!)
For development, use Stripe CLI:
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copy the webhook signing secret from the output and add to `.env`:
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Step 2: Generate Prisma Client & Migrate Database

```bash
npx prisma generate
npx prisma db push
```

## Step 3: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 4: Testing the Flow

### Test Payment (Use Stripe Test Cards)
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### Full Test Flow:
1. Go to `http://localhost:3000`
2. Fill the registration form
3. Click "Proceed to Payment"
4. Use test card to complete payment
5. You'll be redirected to ticket page with QR code
6. Copy the QR code data (JSON)
7. Go to `http://localhost:3000/checkin`
8. Paste QR data and click "Check In"

## Troubleshooting

### Prisma Client Generation Fails
- Ensure `DATABASE_URL` is set in `.env`
- Run `npx prisma generate` again

### Stripe Webhook Not Working
- Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check webhook secret matches in `.env`
- Check webhook logs in terminal

### Payment Completes but Ticket Not Updated
- Verify webhook is receiving events
- Check server logs for errors
- Ensure `TICKET_SECRET_KEY` is set

## Production Deployment

### 1. Update Environment Variables
Set in Vercel/Netlify dashboard:
- `DATABASE_URL` (use managed PostgreSQL)
- All Stripe keys
- `TICKET_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL` (your production URL)

### 2. Configure Stripe Webhooks
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
- Select event: `checkout.session.completed`
- Copy signing secret to production env vars

### 3. Deploy
```bash
vercel deploy
```

### 4. Run Migrations
```bash
npx prisma db push
```

## Need Help?

Check the main README.md for detailed API documentation and architecture details.
