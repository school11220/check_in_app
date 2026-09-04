ALTER TABLE "Event"
  ADD COLUMN "publicationStatus" TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN "publishApprovedBy" TEXT,
  ADD COLUMN "publishApprovedAt" TIMESTAMP(3),
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

CREATE INDEX "Event_publicationStatus_date_idx"
  ON "Event"("publicationStatus", "date");

CREATE TABLE "PaymentRecoveryJob" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'razorpay',
  "operation" TEXT NOT NULL,
  "orderId" TEXT,
  "paymentId" TEXT,
  "ticketId" TEXT,
  "eventId" TEXT,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRecoveryJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentRecoveryJob_status_nextAttemptAt_idx"
  ON "PaymentRecoveryJob"("status", "nextAttemptAt");
CREATE INDEX "PaymentRecoveryJob_orderId_idx"
  ON "PaymentRecoveryJob"("orderId");
CREATE INDEX "PaymentRecoveryJob_paymentId_idx"
  ON "PaymentRecoveryJob"("paymentId");
CREATE INDEX "PaymentRecoveryJob_eventId_createdAt_idx"
  ON "PaymentRecoveryJob"("eventId", "createdAt");
