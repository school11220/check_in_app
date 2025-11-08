# 🚀 PhonePe Integration - Complete Setup Guide

## 📋 Overview

Your ticketing system now uses **PhonePe Payment Gateway** for secure payments. Here's your complete step-by-step guide.

---

## Step 1: Get PhonePe Credentials 🔑

### **1.1 Register for PhonePe Business Account**

1. Visit: https://business.phonepe.com/
2. Sign up for a merchant account
3. Complete KYC verification
4. Wait for approval (usually 24-48 hours)

### **1.2 Get API Credentials**

Once approved:
1. Login to PhonePe Business Dashboard
2. Navigate to **Developer** section
3. Get your credentials:
   - **Merchant ID** (e.g., `MERCHANTUAT`)
   - **Salt Key** (secret key for checksum generation)
   - **Salt Index** (usually `1`)

### **1.3 Configure Environment**

Update your `.env` file:

```bash
# PhonePe Sandbox (for testing)
PHONEPE_MERCHANT_ID="MERCHANTUAT"
PHONEPE_SALT_KEY="099eb0cd-02cf-4e2a-8aca-3e6c6aff0399"
PHONEPE_SALT_INDEX="1"
PHONEPE_API_URL="https://api-preprod.phonepe.com/apis/pg-sandbox"
NEXT_PUBLIC_PHONEPE_MERCHANT_ID="MERCHANTUAT"

# For Production (after testing)
# PHONEPE_API_URL="https://api.phonepe.com/apis/hermes"
```

**⚠️ Important:** The sandbox credentials above are example values. Use your actual credentials from PhonePe dashboard.

---

## Step 2: Generate Prisma Client & Setup Database 🗄️

```bash
# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# Verify database (optional)
npx prisma studio
```

---

## Step 3: Generate Ticket Secret Key 🔐

```bash
# Generate a secure 32-character random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `.env`:
```bash
TICKET_SECRET_KEY="your-generated-key-here"
```

---

## Step 4: Start Development Server 🚀

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Step 5: Test Payment Flow 🧪

### **5.1 Create a Ticket**

1. Go to http://localhost:3000
2. Fill the registration form:
   - **Name:** Test User
   - **Email:** test@example.com
   - **Phone:** 9999999999
   - **Event ID:** EVENT001
3. Click **"Proceed to Payment"**

### **5.2 PhonePe Test Payment**

You'll be redirected to PhonePe payment page. Use these test credentials:

**For Sandbox Testing:**
- The payment page will show test mode
- You can use dummy UPI IDs or cards
- Follow PhonePe's test documentation: https://developer.phonepe.com/docs

**Common Test Scenarios:**
- **Success:** Complete the payment flow
- **Failure:** Click cancel or back button
- **Pending:** Keep the payment page open

### **5.3 Payment Callback**

After payment:
- ✅ **Success:** Redirected to `/ticket/[id]?success=true`
- ❌ **Failed:** Redirected to `/?payment_failed=true`
- ⏳ **Pending:** Redirected to `/ticket/[id]?pending=true`

---

## Step 6: Generate QR Code for Ticket 🎫

After successful payment, the system automatically:

1. **Generates HMAC Token:**
   ```
   HMAC-SHA256(ticketId + TICKET_SECRET_KEY) → secure token
   ```

2. **Creates QR Code:**
   ```json
   {
     "ticketId": "abc-123-xyz",
     "token": "generated-hmac-token"
   }
   ```

3. **Displays QR Code:**
   - User sees QR code on `/ticket/[id]` page
   - Can download or screenshot
   - Contains signed payload for security

---

## Step 7: Check-In Process 🎟️

### **7.1 Access Check-In Portal**

Go to: http://localhost:3000/checkin

### **7.2 Scan QR Code**

**Manual Method (for testing):**
1. Copy the QR code data from ticket page
2. Paste in check-in portal
3. Click **"Check In"**

**Example QR Data:**
```json
{
  "ticketId": "clpq8xz1y0000qs4p8h2j9k3l",
  "token": "a3f5c8e9d2b1..."
}
```

### **7.3 Validation Flow**

The system will:
1. ✅ Verify ticket exists
2. ✅ Check payment status (must be "paid")
3. ✅ Verify HMAC token (prevents tampering)
4. ✅ Check if already checked in (prevents duplicates)
5. ✅ Mark ticket as checked in

### **7.4 Results**

- **✅ Success:** "Check-in successful! Welcome [Name]"
- **❌ Invalid Token:** "Invalid ticket token"
- **❌ Already Used:** "Ticket already checked in"
- **❌ Not Paid:** "Ticket payment not completed"

---

## Step 8: Production Deployment 🌐

### **8.1 Switch to Production Credentials**

Update `.env` for production:

```bash
# PhonePe Production
PHONEPE_MERCHANT_ID="your-live-merchant-id"
PHONEPE_SALT_KEY="your-live-salt-key"
PHONEPE_SALT_INDEX="1"
PHONEPE_API_URL="https://api.phonepe.com/apis/hermes"
NEXT_PUBLIC_PHONEPE_MERCHANT_ID="your-live-merchant-id"
```

### **8.2 Configure Callback URL in PhonePe Dashboard**

1. Login to PhonePe Business Dashboard
2. Go to **API Configuration**
3. Set callback URL: `https://yourdomain.com/api/phonepe/callback`
4. Save and verify

### **8.3 Deploy to Vercel/Railway**

```bash
# Deploy to Vercel
vercel deploy

# Or deploy to Railway
railway up
```

Set all environment variables in your hosting platform.

---

## 🔍 Testing Checklist

- [ ] PhonePe credentials configured in `.env`
- [ ] Database schema pushed
- [ ] Ticket secret key generated
- [ ] Dev server running
- [ ] Registration form submits successfully
- [ ] Redirected to PhonePe payment page
- [ ] Payment completes successfully
- [ ] Redirected back to ticket page
- [ ] QR code displayed
- [ ] Check-in portal accessible
- [ ] Valid ticket check-in succeeds
- [ ] Duplicate check-in blocked
- [ ] Invalid token rejected

---

## 🎯 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **POST** | `/api/tickets` | Create ticket + PhonePe payment |
| **GET** | `/api/tickets/[id]` | Get ticket details |
| **POST** | `/api/phonepe/callback` | Handle payment callback |
| **GET** | `/api/phonepe/callback?transactionId=xxx` | Check payment status |
| **POST** | `/api/checkin` | Validate & check-in |

---

## 🔐 Security Features

✅ **HMAC-SHA256** token signing for tickets  
✅ **PhonePe checksum** verification for callbacks  
✅ **Timing-safe** token comparison  
✅ **Payment validation** before check-in  
✅ **Duplicate prevention** (one-time check-in)  

---

## 🐛 Common Issues

### **Issue 1: Payment not redirecting**
```bash
# Check callback URL configuration
# Verify NEXT_PUBLIC_APP_URL is correct
```

### **Issue 2: Checksum verification failed**
```bash
# Verify PHONEPE_SALT_KEY is correct
# Check Salt Index matches
```

### **Issue 3: QR code not generating**
```bash
# Ensure TICKET_SECRET_KEY is set
# Check ticket status is "paid"
```

### **Issue 4: Check-in fails**
```bash
# Verify token matches
# Check ticket payment status
# Ensure not already checked in
```

---

## 📚 PhonePe Documentation

- **API Docs:** https://developer.phonepe.com/docs
- **Sandbox Testing:** https://developer.phonepe.com/docs/test-and-verify
- **Production Setup:** https://developer.phonepe.com/docs/production-setup

---

## 🎉 Success Criteria

Your system is working when:

✅ Registration creates pending ticket  
✅ PhonePe payment page opens  
✅ Payment completion updates ticket to "paid"  
✅ HMAC token generated  
✅ QR code displays correctly  
✅ Check-in validates and accepts valid tickets  
✅ Invalid/used tickets rejected  

---

**🚀 You're all set! Start testing your ticketing system with PhonePe!**

Need help? Check the troubleshooting section or PhonePe documentation.
