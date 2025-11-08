# ✅ Setup Checklist

Use this checklist to ensure everything is configured correctly before running the application.

## 🔧 Environment Setup

### 1. Database Configuration
- [ ] `.env` file exists
- [ ] `DATABASE_URL` is set (Prisma local DB already configured)
- [ ] Database is accessible

### 2. Stripe Configuration
- [ ] Created Stripe account at https://stripe.com
- [ ] Obtained test API keys from https://dashboard.stripe.com/test/apikeys
- [ ] `STRIPE_SECRET_KEY` set in `.env` (starts with `sk_test_`)
- [ ] `STRIPE_PUBLISHABLE_KEY` set in `.env` (starts with `pk_test_`)

### 3. Security Configuration  
- [ ] Generated `TICKET_SECRET_KEY` (minimum 32 characters)
  ```bash
  # Generate with:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] `TICKET_SECRET_KEY` set in `.env`

### 4. Stripe Webhook Setup
- [ ] Installed Stripe CLI
  - Download from: https://stripe.com/docs/stripe-cli
- [ ] Logged into Stripe CLI: `stripe login`
- [ ] Started webhook listener: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Copied webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 5. Application URL
- [ ] `NEXT_PUBLIC_APP_URL` set to `http://localhost:3000` (or your URL)

## 📦 Dependencies

- [ ] Node.js 18+ installed
- [ ] All npm packages installed: `npm install`
- [ ] Prisma Client generated: `npx prisma generate`
- [ ] Database schema pushed: `npx prisma db push`

## 🧪 Quick Tests

### Test 1: Environment Variables
```bash
# Check all required variables are set
node -e "
const required = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'TICKET_SECRET_KEY'];
required.forEach(v => {
  console.log(v, process.env[v] ? '✅' : '❌');
});
"
```

### Test 2: Database Connection
```bash
npx prisma db pull
# Should connect without errors
```

### Test 3: Prisma Client
```bash
npm run db:studio
# Should open Prisma Studio at http://localhost:5555
```

### Test 4: Development Server
```bash
npm run dev
# Should start without errors
# Visit http://localhost:3000
```

## 🚀 Ready to Run

If all checkboxes are checked, you're ready to start:

### Terminal 1: Webhook Listener
```bash
npm run stripe:listen
# or
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Terminal 2: Development Server
```bash
npm run dev
```

### Browser
Open http://localhost:3000

## 🎫 Test the Full Flow

- [ ] 1. Visit homepage
- [ ] 2. Fill registration form
  - Name: Your name
  - Email: test@example.com
  - Phone: +91 9876543210
  - Event ID: EVENT-2025
- [ ] 3. Click "Proceed to Payment"
- [ ] 4. Redirected to Stripe Checkout
- [ ] 5. Enter test card: `4242 4242 4242 4242`
- [ ] 6. Complete payment
- [ ] 7. Redirected to ticket page
- [ ] 8. QR code is displayed
- [ ] 9. Webhook listener shows success message
- [ ] 10. Visit http://localhost:3000/checkin
- [ ] 11. Copy QR code data (JSON format)
- [ ] 12. Paste and submit for check-in
- [ ] 13. See success message
- [ ] 14. Try checking in again - should fail

## 🐛 Troubleshooting

### Database Issues
```bash
# Reset database (WARNING: Deletes all data)
npx prisma db push --force-reset

# Generate Prisma Client again
npx prisma generate
```

### Stripe Webhook Issues
```bash
# Restart webhook listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Update webhook secret in .env
STRIPE_WEBHOOK_SECRET="whsec_new_secret_here"

# Restart dev server
```

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📚 Documentation Reference

| Issue | See Document |
|-------|-------------|
| Setup instructions | `QUICKSTART.md` |
| Testing procedures | `TESTING.md` |
| Deployment help | `DEPLOYMENT.md` |
| Code structure | `PROJECT_STRUCTURE.md` |
| General overview | `README.md` |

## ✨ Production Deployment Checklist

When ready for production:

- [ ] Updated to Stripe LIVE keys (not test)
- [ ] Production database configured
- [ ] All environment variables set in hosting platform
- [ ] Stripe webhook configured for production URL
- [ ] HTTPS enabled
- [ ] Domain configured
- [ ] Database backups enabled
- [ ] Error monitoring configured (optional but recommended)
- [ ] Tested full flow in production

## 🎉 Success Indicators

You'll know everything is working when:

✅ No TypeScript errors
✅ Server starts without errors
✅ Database connects successfully
✅ Payment completes successfully
✅ Webhook receives and processes events
✅ QR code generates correctly
✅ Check-in validates tickets
✅ Duplicate check-in prevented

---

**Need help?** Refer to the documentation files or check the troubleshooting sections.

**Ready to deploy?** See `DEPLOYMENT.md` for production setup.
