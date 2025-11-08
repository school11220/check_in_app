# 🎫 Quick Reference - PhonePe Ticketing System

## 🚀 Start in 5 Minutes

### 1️⃣ Setup Environment (.env)
```bash
PHONEPE_MERCHANT_ID="MERCHANTUAT"
PHONEPE_SALT_KEY="099eb0cd-02cf-4e2a-8aca-3e6c6aff0399"
PHONEPE_SALT_INDEX="1"
PHONEPE_API_URL="https://api-preprod.phonepe.com/apis/pg-sandbox"
TICKET_SECRET_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

### 2️⃣ Setup Database
```bash
npx prisma generate && npx prisma db push
```

### 3️⃣ Start Server
```bash
npm run dev
```

---

## 📱 User Flow (3 Simple Steps)

```
1. Register → 2. Pay with PhonePe → 3. Get QR Ticket
```

---

## 🎟️ Check-In Flow (4 Steps)

```
1. Open /checkin → 2. Scan QR → 3. Validate → 4. Check-In!
```

---

## 🔑 Key Files

| File | What It Does |
|------|--------------|
| `lib/phonepe.ts` | PhonePe payment API |
| `lib/utils.ts` | QR & HMAC generation |
| `app/api/tickets/route.ts` | Create ticket |
| `app/api/phonepe/callback/route.ts` | Payment callback |
| `app/api/checkin/route.ts` | Guest check-in |

---

## 🎯 Important URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Registration |
| http://localhost:3000/ticket/[id] | View ticket & QR |
| http://localhost:3000/checkin | Staff check-in |

---

## ✅ Test Card (PhonePe Sandbox)

Use any test UPI ID or follow PhonePe test documentation.

---

## 🐛 Quick Fixes

```bash
# Prisma error?
npx prisma generate

# Payment not working?
# Check PhonePe credentials in .env

# QR not showing?
# Ensure ticket status is "paid"

# Check-in fails?
# Verify token is correct
```

---

## 📖 Full Documentation

- **Setup:** `PHONEPE_INTEGRATION.md`
- **QR Guide:** `QR_CHECKIN_GUIDE.md`
- **Complete:** `PHONEPE_SETUP_COMPLETE.md`

---

**🎉 You're ready to go!**
