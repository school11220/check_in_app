# 🧪 Testing Guide

## Test Stripe Cards

Use these test card numbers for different scenarios:

### Successful Payments
```
Card: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### Declined Cards
```
Card: 4000 0000 0000 0002 (Generic decline)
Card: 4000 0000 0000 9995 (Insufficient funds)
```

### 3D Secure Authentication
```
Card: 4000 0025 0000 3155 (Requires authentication)
```

[Full list of test cards](https://stripe.com/docs/testing)

## Testing Workflow

### 1. Registration & Payment
```bash
# Start dev server
npm run dev

# In another terminal, start Stripe webhook listener
npm run stripe:listen
# or
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

1. Open `http://localhost:3000`
2. Fill form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Phone: "+91 9876543210"
   - Event ID: "EVENT-2025"
3. Click "Proceed to Payment"
4. Use test card: `4242 4242 4242 4242`
5. Complete payment
6. Verify redirect to ticket page with QR code

### 2. Webhook Verification
Check your webhook listener terminal, you should see:
```
✅ Ticket [ticket-id] marked as paid with token
```

### 3. Database Verification
```bash
npm run db:studio
```
- Open Prisma Studio (http://localhost:5555)
- Check `Ticket` table
- Verify `status = "paid"` and `token` is set

### 4. QR Code Testing
1. On ticket page, copy the QR code image
2. Or manually copy the payload:
```json
{
  "ticketId": "your-ticket-id",
  "token": "generated-token"
}
```

### 5. Check-In Testing
1. Go to `http://localhost:3000/checkin`
2. Paste QR JSON data
3. Click "Check In"
4. Should see success message
5. Try checking in again - should fail with "already checked in"

### 6. Invalid Token Testing
Try modifying the token in QR data:
```json
{
  "ticketId": "valid-ticket-id",
  "token": "invalid-token-abc123"
}
```
Should fail with "Invalid ticket token"

## API Testing with cURL

### Create Ticket
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+91 9876543210",
    "eventId": "EVENT-2025"
  }'
```

### Get Ticket
```bash
curl http://localhost:3000/api/tickets/YOUR_TICKET_ID
```

### Check-In
```bash
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "YOUR_TICKET_ID",
    "token": "YOUR_TOKEN"
  }'
```

## Automated Testing Scenarios

### Scenario 1: Happy Path
1. Create ticket → Success
2. Complete payment → Webhook updates ticket
3. Generate QR code → Success
4. Check-in → Success
5. Check-in again → Fail (already checked in)

### Scenario 2: Payment Failure
1. Create ticket → Status: pending
2. Cancel payment → Status remains pending
3. Try to check-in → Fail (payment not complete)

### Scenario 3: Security
1. Create valid ticket
2. Modify token
3. Try check-in → Fail (invalid token)
4. Use correct token → Success

### Scenario 4: Multiple Events
1. Create ticket for EVENT-2025
2. Create ticket for EVENT-2026
3. Verify both work independently
4. Check-in should respect event boundaries

## Database Queries

### View All Tickets
```sql
SELECT * FROM "Ticket";
```

### View Paid Tickets
```sql
SELECT * FROM "Ticket" WHERE status = 'paid';
```

### View Checked-In Tickets
```sql
SELECT * FROM "Ticket" WHERE "checkedIn" = true;
```

### View Pending Tickets
```sql
SELECT * FROM "Ticket" WHERE status = 'pending';
```

### Count Tickets by Event
```sql
SELECT "eventId", COUNT(*) as count 
FROM "Ticket" 
WHERE status = 'paid' 
GROUP BY "eventId";
```

### Check-In Rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE "checkedIn" = true) as checked_in,
  COUNT(*) FILTER (WHERE "checkedIn" = false) as not_checked_in,
  COUNT(*) as total
FROM "Ticket"
WHERE status = 'paid';
```

## Debugging Tips

### Webhook Not Working
```bash
# Check Stripe CLI is running
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Check webhook logs
# Look for "checkout.session.completed" events

# Verify webhook secret in .env matches CLI output
```

### Token Generation Issues
```bash
# Test token generation manually
node -e "
const crypto = require('crypto');
const secret = 'your-secret-key-here';
const ticketId = 'test-id';
const hmac = crypto.createHmac('sha256', secret);
hmac.update(ticketId);
console.log('Token:', hmac.digest('hex'));
"
```

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Reset database (WARNING: Deletes all data)
npx prisma db push --force-reset
```

## Performance Testing

### Load Test Check-In Endpoint
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -p checkin.json -T application/json \
  http://localhost:3000/api/checkin
```

### Monitor Response Times
Use browser DevTools Network tab to check:
- Ticket creation: < 500ms
- Payment redirect: < 300ms
- Check-in: < 200ms

## Security Testing

### Test HMAC Verification
1. Valid token → ✅ Success
2. Wrong token → ❌ Fail
3. Empty token → ❌ Fail
4. Timing attack → Should use `timingSafeEqual`

### Test Payment Status
1. Pending ticket → ❌ Cannot check-in
2. Paid ticket → ✅ Can check-in
3. Refunded ticket → ❌ Cannot check-in

### Test Double Check-In
1. First check-in → ✅ Success
2. Second check-in → ❌ Already checked in
3. Database should show `checkedIn = true`

## Success Criteria

✅ User can register and pay successfully
✅ Webhook updates ticket status to "paid"
✅ QR code is generated correctly
✅ Valid tickets can check-in
✅ Invalid/tampered tickets are rejected
✅ Double check-in is prevented
✅ All database constraints are enforced

---

For production deployment testing, see QUICKSTART.md
