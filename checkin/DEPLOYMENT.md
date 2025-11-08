# 🚀 Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- ✅ Stripe account with API keys
- ✅ PostgreSQL database (production)
- ✅ Domain name (optional but recommended)
- ✅ Git repository

## Option 1: Vercel Deployment (Recommended)

### Step 1: Prepare Your Database

Choose a managed PostgreSQL provider:

#### Neon (Recommended - Free tier)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy connection string
4. Format: `postgresql://user:pass@host/database?sslmode=require`

#### Railway
1. Sign up at [railway.app](https://railway.app)
2. Create PostgreSQL service
3. Copy connection string

#### Supabase
1. Sign up at [supabase.com](https://supabase.com)
2. Create project
3. Get database URL from Settings → Database

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

Or use [Vercel Dashboard](https://vercel.com):
1. Import Git repository
2. Configure project
3. Deploy

### Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
DATABASE_URL=postgresql://user:pass@host/database?sslmode=require
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_production_secret
TICKET_SECRET_KEY=your-production-secret-32-chars-min
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Important:** Use LIVE Stripe keys for production!

### Step 4: Run Database Migration

```bash
# After deployment, run migration
npx prisma db push
```

Or use Vercel's CLI:
```bash
vercel env pull
npx prisma db push
```

### Step 5: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.vercel.app/api/webhooks/stripe`
4. Select event: `checkout.session.completed`
5. Add endpoint
6. Copy signing secret
7. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables
8. Redeploy to apply changes

### Step 6: Test Production

1. Visit your deployed URL
2. Create a test ticket (use test mode first)
3. Complete payment
4. Verify webhook is received
5. Check QR code generation
6. Test check-in flow

### Step 7: Switch to Live Mode

1. Update Stripe keys to live mode in Vercel
2. Update webhook endpoint for live mode
3. Test with real card (small amount)
4. Monitor Stripe Dashboard

## Option 2: Railway Deployment

### Step 1: Create Railway Project
```bash
# Install Railway CLI
npm i -g railway

# Login
railway login

# Initialize
railway init

# Link to project
railway link
```

### Step 2: Add PostgreSQL
```bash
railway add postgresql
```

### Step 3: Set Environment Variables
```bash
railway variables set STRIPE_SECRET_KEY=sk_live_xxx
railway variables set STRIPE_PUBLISHABLE_KEY=pk_live_xxx
railway variables set STRIPE_WEBHOOK_SECRET=whsec_xxx
railway variables set TICKET_SECRET_KEY=your-secret-here
railway variables set NEXT_PUBLIC_APP_URL=https://your-railway-app.up.railway.app
```

### Step 4: Deploy
```bash
railway up
```

### Step 5: Run Migration
```bash
railway run npx prisma db push
```

## Option 3: Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/ticketing
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - TICKET_SECRET_KEY=${TICKET_SECRET_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=ticketing
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Deploy
```bash
docker-compose up -d
docker-compose exec app npx prisma db push
```

## Post-Deployment Checklist

### Security
- [ ] All environment variables set
- [ ] Using HTTPS (not HTTP)
- [ ] Stripe webhook secret configured
- [ ] TICKET_SECRET_KEY is strong (32+ chars)
- [ ] Database uses SSL connection
- [ ] Test mode keys removed
- [ ] CORS configured if needed

### Stripe Setup
- [ ] Webhook endpoint configured
- [ ] `checkout.session.completed` event selected
- [ ] Webhook signing secret updated
- [ ] Test payment successful
- [ ] Webhook logs show success

### Database
- [ ] Migration completed (`prisma db push`)
- [ ] Connection is stable
- [ ] Backups configured
- [ ] Connection pooling enabled (if needed)

### Application
- [ ] Home page loads
- [ ] Registration form works
- [ ] Payment flow completes
- [ ] QR code generates
- [ ] Check-in portal accessible
- [ ] Check-in validation works

### Monitoring
- [ ] Error logging configured (Sentry, LogRocket)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Stripe Dashboard monitoring
- [ ] Database monitoring

## Troubleshooting Production Issues

### Webhook Not Working
```bash
# Check webhook endpoint is publicly accessible
curl https://yourdomain.com/api/webhooks/stripe

# Check Stripe Dashboard → Webhooks → Recent events
# Look for failed deliveries

# Verify webhook secret matches environment variable
```

### Database Connection Issues
```bash
# Test connection string
npx prisma db pull

# Check connection pool settings
# Add ?connection_limit=5 to DATABASE_URL if needed
```

### Payment Not Processing
1. Check Stripe Dashboard for errors
2. Verify API keys are live mode (start with `pk_live_` and `sk_live_`)
3. Check webhook endpoint is correct
4. Review application logs

### QR Code Not Generating
1. Check `TICKET_SECRET_KEY` is set
2. Verify ticket status is "paid"
3. Check token was generated by webhook
4. Review browser console for errors

## Scaling Considerations

### Database
- Use connection pooling (Prisma Accelerate or PgBouncer)
- Add indexes on frequently queried fields
- Consider read replicas for high traffic

### Application
- Enable Vercel Edge Functions if needed
- Configure caching headers
- Use CDN for static assets

### Monitoring
- Set up alerts for failed payments
- Monitor webhook delivery rates
- Track check-in success rates
- Set up error tracking

## Backup & Recovery

### Database Backups
```bash
# Manual backup
pg_dump DATABASE_URL > backup.sql

# Restore
psql DATABASE_URL < backup.sql
```

Most managed database providers offer automatic backups.

### Environment Variables Backup
Save all environment variables in a secure location (password manager, not Git).

## Support & Maintenance

### Regular Tasks
- Monitor Stripe Dashboard
- Review error logs
- Check database performance
- Update dependencies
- Review security advisories

### Updates
```bash
# Update dependencies
npm update

# Update Prisma
npm update @prisma/client prisma

# Regenerate Prisma Client
npx prisma generate
```

---

For development setup, see QUICKSTART.md
For testing, see TESTING.md
