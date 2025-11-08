# 🎫 QR Code Generation & Guest Check-In Guide

## 📱 How QR Code Generation Works

### Automatic QR Generation Flow

```
Payment Success → PhonePe Callback → Generate HMAC Token → Create QR Code → Display to User
```

### What's in the QR Code?

```json
{
  "ticketId": "unique-ticket-id",
  "token": "hmac-sha256-signed-token"
}
```

The QR code contains:
- **ticketId**: Unique identifier for the ticket
- **token**: HMAC-SHA256 signature for security (prevents forgery)

---

## 🔐 QR Code Security

### Token Generation (Backend)
```typescript
// In lib/utils.ts
export function generateTicketToken(ticketId: string): string {
  const secret = process.env.TICKET_SECRET_KEY;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(ticketId);
  return hmac.digest('hex');
}
```

### Token Verification (Check-in)
```typescript
// In lib/utils.ts
export function verifyTicketToken(ticketId: string, token: string): boolean {
  const expectedToken = generateTicketToken(ticketId);
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(expectedToken, 'hex')
  );
}
```

**Why HMAC?**
- ✅ Prevents ticket forgery
- ✅ Cannot be guessed or brute-forced
- ✅ Timing-safe comparison prevents timing attacks
- ✅ No database lookup needed for validation

---

## 🎯 Step-by-Step: User Journey

### Step 1: User Registers & Pays

```bash
1. User fills form → POST /api/tickets
2. System creates pending ticket in database
3. PhonePe payment link generated
4. User redirected to PhonePe
5. User completes payment
```

### Step 2: Payment Callback (Automatic)

```bash
6. PhonePe sends callback → POST /api/phonepe/callback
7. System verifies checksum
8. Ticket status updated: pending → paid
9. HMAC token generated and stored
10. User redirected to ticket page
```

### Step 3: QR Code Display

```bash
11. Ticket page loads → GET /api/tickets/[id]
12. System fetches ticket with token
13. QR code generated (client-side)
14. QR displays: {ticketId, token}
15. User downloads/screenshots QR
```

### Step 4: Check-In at Event

```bash
16. Staff opens /checkin portal
17. Scans QR code (or manual input)
18. System validates → POST /api/checkin
19. Checks: ticket exists, paid, token valid, not used
20. Marks ticket as checked in
21. Displays success message
```

---

## 🎟️ Guest Check-In Process (Detailed)

### Option 1: Manual QR Input (Current Implementation)

**Staff Portal:** http://localhost:3000/checkin

1. **Get QR Data**
   - User shows QR code on phone
   - Staff copies the JSON data
   - Or use QR scanner app to extract JSON

2. **Paste & Submit**
   ```json
   {
     "ticketId": "clpq8xz1y0000qs4p8h2j9k3l",
     "token": "a3f5c8e9d2b1f4c7e8d9a1b2c3d4e5f6..."
   }
   ```

3. **Validation**
   - ✅ Ticket found
   - ✅ Payment verified (status = "paid")
   - ✅ Token matches (HMAC verification)
   - ✅ Not already checked in

4. **Result**
   - ✅ Success → "Welcome, [Name]!"
   - ❌ Fail → Show error message

### Option 2: Camera-Based QR Scanner (Enhancement)

**To implement camera scanning:**

```bash
# Install QR scanner library
npm install react-qr-reader
```

```typescript
// components/QRScanner.tsx
import { QrReader } from 'react-qr-reader';

export default function QRScanner({ onScan }) {
  return (
    <QrReader
      onResult={(result, error) => {
        if (result) {
          onScan(result?.text);
        }
      }}
      constraints={{ facingMode: 'environment' }}
    />
  );
}
```

---

## 🔄 Check-In Validation Flow

```typescript
// Validation steps in /api/checkin

1. Parse QR data → Extract ticketId & token
   ↓
2. Fetch ticket from database
   ↓
3. Check if ticket exists
   ↓
4. Verify payment status (must be "paid")
   ↓
5. Verify HMAC token
   ↓
6. Check if already checked in
   ↓
7. Update checkedIn = true
   ↓
8. Return success with guest info
```

---

## 📊 Database Operations

### When Payment Succeeds

```typescript
// Update ticket status and add token
await prisma.ticket.update({
  where: { id: ticketId },
  data: {
    status: 'paid',
    token: generateTicketToken(ticketId),
  },
});
```

### When Guest Checks In

```typescript
// Mark as checked in
await prisma.ticket.update({
  where: { id: ticketId },
  data: {
    checkedIn: true,
  },
});
```

### Query Check-In Statistics

```typescript
// Get check-in count
const stats = await prisma.ticket.aggregate({
  where: {
    eventId: 'EVENT001',
    status: 'paid',
  },
  _count: {
    _all: true,
  },
  _sum: {
    checkedIn: true,
  },
});

console.log(`Total Paid: ${stats._count._all}`);
console.log(`Checked In: ${stats._sum.checkedIn}`);
```

---

## 🎨 Customizing QR Code Design

### Current Implementation (Data URL)

```typescript
// In lib/utils.ts
import QRCode from 'qrcode';

export async function generateQRCode(ticketId: string, token: string): Promise<string> {
  const payload = JSON.stringify({ ticketId, token });
  return await QRCode.toDataURL(payload);
}
```

### Add Logo/Branding

```typescript
export async function generateQRCodeWithLogo(
  ticketId: string,
  token: string,
  logoUrl: string
): Promise<string> {
  const payload = JSON.stringify({ ticketId, token });
  
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H', // High error correction for logo
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
```

### Download QR as PNG

```typescript
// Add download button on ticket page
function downloadQR() {
  const link = document.createElement('a');
  link.download = `ticket-${ticketId}.png`;
  link.href = qrCodeDataURL;
  link.click();
}
```

---

## 🚨 Error Handling

### Common Check-In Errors

| Error | Reason | Solution |
|-------|--------|----------|
| Ticket not found | Invalid ticketId | Verify QR code is correct |
| Payment not completed | Status = "pending" | Complete payment first |
| Invalid token | Token mismatch | QR code tampered/forged |
| Already checked in | checkedIn = true | Ticket used already |

### Staff Portal Error Messages

```typescript
const ERROR_MESSAGES = {
  'ticket_not_found': 'This ticket does not exist',
  'not_paid': 'Payment not completed for this ticket',
  'invalid_token': 'This ticket has been tampered with',
  'already_used': 'This ticket was already checked in',
};
```

---

## 📱 Mobile-Friendly Check-In

### PWA Installation

Add to `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
});

module.exports = withPWA({
  // ...config
});
```

### Offline Support

```typescript
// Store check-ins locally when offline
if (!navigator.onLine) {
  localStorage.setItem(`pending_checkin_${ticketId}`, JSON.stringify({
    ticketId,
    token,
    timestamp: Date.now(),
  }));
  
  // Sync when back online
  window.addEventListener('online', syncPendingCheckins);
}
```

---

## 🎯 Production Best Practices

### 1. Rate Limiting
```typescript
// Prevent spam check-ins
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
});
```

### 2. Audit Logging
```typescript
// Log all check-in attempts
await prisma.checkinLog.create({
  data: {
    ticketId,
    success: true,
    timestamp: new Date(),
    staffMember: 'staff@example.com',
  },
});
```

### 3. Real-Time Dashboard
```typescript
// WebSocket for live check-in count
import { io } from 'socket.io-client';

socket.on('checkin', (data) => {
  updateCheckinCount(data.eventId);
});
```

---

## ✅ Testing Scenarios

### Test 1: Happy Path
```
1. Register → Pay → Get QR → Check-in → ✅ Success
```

### Test 2: Duplicate Check-In
```
1. Check-in once → ✅ Success
2. Check-in again → ❌ Already used
```

### Test 3: Tampered Token
```
1. Get valid QR
2. Modify token value
3. Try check-in → ❌ Invalid token
```

### Test 4: Unpaid Ticket
```
1. Register but don't pay
2. Try to generate QR → ❌ No token
3. Try check-in → ❌ Not paid
```

---

## 🎉 Quick Commands

```bash
# Test ticket creation
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","eventId":"EVENT001"}'

# Test check-in
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"ticketId":"xxx","token":"yyy"}'

# View all tickets
npx prisma studio
```

---

**🎫 Your check-in system is ready! Test the flow and deploy when confident.**

Need camera-based scanning? Let me know and I'll help implement it!
