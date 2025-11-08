# 📁 Project Structure

```
checkin/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes
│   │   ├── checkin/
│   │   │   └── route.ts         # POST - Check-in endpoint
│   │   ├── tickets/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts     # GET - Get ticket by ID
│   │   │   └── route.ts         # POST - Create ticket & Stripe session
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts     # POST - Stripe webhook handler
│   ├── checkin/
│   │   └── page.tsx             # Check-in portal UI
│   ├── ticket/
│   │   └── [id]/
│   │       └── page.tsx         # Ticket display with QR code
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page (registration form)
│
├── components/
│   └── TicketForm.tsx           # Registration form component
│
├── lib/
│   ├── prisma.ts                # Prisma Client singleton
│   ├── stripe.ts                # Stripe SDK configuration
│   └── utils.ts                 # Utility functions (HMAC, QR generation)
│
├── prisma/
│   └── schema.prisma            # Database schema (Ticket model)
│
├── types/
│   └── index.ts                 # TypeScript type definitions
│
├── public/                      # Static files
│
├── .env                         # Environment variables (not in Git)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── next.config.ts               # Next.js configuration
│
├── README.md                    # Main documentation
├── QUICKSTART.md                # Quick start guide
├── TESTING.md                   # Testing guide
├── DEPLOYMENT.md                # Deployment guide
└── setup.sh                     # Setup automation script
```

## 📄 File Descriptions

### Core Application Files

#### `app/page.tsx`
- Home page with registration form
- User entry point
- Links to check-in portal

#### `components/TicketForm.tsx`
- Registration form component
- Handles user input (name, email, phone, eventId)
- Submits to `/api/tickets`
- Redirects to Stripe Checkout

#### `app/ticket/[id]/page.tsx`
- Displays ticket details after payment
- Shows QR code (if paid)
- Handles payment success callback

#### `app/checkin/page.tsx`
- Staff check-in interface
- QR code scanner (manual input)
- Shows check-in result

### API Routes

#### `app/api/tickets/route.ts`
**POST** - Create Ticket
- Validates form data
- Creates pending ticket in DB
- Creates Stripe Checkout Session
- Returns session URL

#### `app/api/tickets/[id]/route.ts`
**GET** - Get Ticket
- Fetches ticket by ID
- Returns ticket details

#### `app/api/webhooks/stripe/route.ts`
**POST** - Stripe Webhook
- Verifies webhook signature
- Handles `checkout.session.completed`
- Updates ticket to "paid"
- Generates HMAC token

#### `app/api/checkin/route.ts`
**POST** - Check-In
- Validates ticket ID and token
- Verifies HMAC signature
- Checks payment status
- Prevents duplicate check-ins
- Marks ticket as checked in

### Core Libraries

#### `lib/prisma.ts`
```typescript
- Prisma Client singleton
- Prevents multiple instances in development
- Used by all API routes
```

#### `lib/stripe.ts`
```typescript
- Stripe SDK configuration
- API version: 2025-10-29.clover
- TypeScript support enabled
```

#### `lib/utils.ts`
```typescript
Key Functions:
- generateTicketToken(ticketId)    // Create HMAC signature
- verifyTicketToken(ticketId, token) // Verify signature
- generateQRCode(ticketId, token)  // Create QR data URL
- formatINR(amount)                // Format currency
```

### Database Schema

#### `prisma/schema.prisma`
```prisma
model Ticket {
  id         String   @id @default(uuid())
  name       String                          // Attendee name
  email      String?                         // Optional email
  phone      String?                         // Optional phone
  eventId    String                          // Event identifier
  status     String   @default("pending")    // pending | paid | refunded
  token      String?                         // HMAC signature
  checkedIn  Boolean  @default(false)        // Check-in status
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Type Definitions

#### `types/index.ts`
```typescript
- TicketFormData      // Form submission data
- TicketData          // Full ticket object
- CheckInRequest      // Check-in request payload
- CheckInResponse     // Check-in response with result
```

## 🔄 Data Flow

### Registration & Payment Flow
```
User Form → POST /api/tickets
           ↓
    Create Ticket (pending)
           ↓
    Create Stripe Session
           ↓
    Redirect to Stripe
           ↓
    User Completes Payment
           ↓
    Stripe Webhook → POST /api/webhooks/stripe
           ↓
    Update Ticket (paid) + Generate Token
           ↓
    User Redirected to /ticket/[id]
           ↓
    Display QR Code
```

### Check-In Flow
```
Scan QR Code → Extract {ticketId, token}
              ↓
       POST /api/checkin
              ↓
       Fetch Ticket from DB
              ↓
       Verify Payment Status
              ↓
       Verify HMAC Token
              ↓
       Check if Already Checked In
              ↓
       Mark as Checked In
              ↓
       Return Success/Failure
```

## 🔐 Security Architecture

### Token Generation
```typescript
// Server-side only
HMAC-SHA256(ticketId, TICKET_SECRET_KEY) → token
```

### Token Verification
```typescript
// Timing-safe comparison
crypto.timingSafeEqual(providedToken, expectedToken)
```

### Stripe Webhook Verification
```typescript
stripe.webhooks.constructEvent(body, signature, secret)
```

## 🎨 UI Components Hierarchy

```
Page Layout
├── Home (/)
│   └── TicketForm
│       ├── Name Input
│       ├── Email Input
│       ├── Phone Input
│       ├── Event ID Input
│       └── Submit Button
│
├── Ticket (/ticket/[id])
│   ├── Header (Status)
│   ├── Details Section
│   │   ├── Name
│   │   ├── Email
│   │   ├── Phone
│   │   ├── Event ID
│   │   └── Ticket ID
│   └── QR Code Section
│       ├── QR Image
│       └── Instructions
│
└── Check-In (/checkin)
    ├── Scanner Interface
    │   ├── QR Input
    │   └── Submit Button
    └── Result Display
        ├── Success/Fail Icon
        ├── Message
        └── Ticket Details
```

## 📊 Database Relationships

Currently single table architecture. Future expansion could include:

```
Event (future)
├── id
├── name
├── date
└── tickets → Ticket[]

Ticket
├── id
├── eventId (FK to Event)
├── name
├── email
├── phone
├── status
├── token
├── checkedIn
├── createdAt
└── updatedAt

CheckIn (future - for audit trail)
├── id
├── ticketId (FK to Ticket)
├── timestamp
└── staffMember
```

## 🚀 Key Features by File

### Security Features
- `lib/utils.ts` - HMAC token generation
- `app/api/webhooks/stripe/route.ts` - Webhook signature verification
- `app/api/checkin/route.ts` - Token validation

### Payment Features
- `app/api/tickets/route.ts` - Stripe session creation
- `app/api/webhooks/stripe/route.ts` - Payment confirmation
- `lib/stripe.ts` - Stripe SDK configuration

### UI Features
- `components/TicketForm.tsx` - Registration form
- `app/ticket/[id]/page.tsx` - Ticket display
- `app/checkin/page.tsx` - Check-in interface

### Database Features
- `prisma/schema.prisma` - Schema definition
- `lib/prisma.ts` - Connection management
- All API routes - CRUD operations

## 📝 Environment Variables Usage

| Variable | Used In |
|----------|---------|
| `DATABASE_URL` | All API routes via Prisma |
| `STRIPE_SECRET_KEY` | `lib/stripe.ts`, all payment routes |
| `STRIPE_PUBLISHABLE_KEY` | Client-side (if needed) |
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts` |
| `TICKET_SECRET_KEY` | `lib/utils.ts` (token generation) |
| `NEXT_PUBLIC_APP_URL` | Stripe redirect URLs |

---

For architecture decisions and rationale, see README.md
