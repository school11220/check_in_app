-- Additive feature tables. Existing Event and Ticket data is unchanged.
CREATE TABLE "AttendeeSegment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventId" TEXT,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttendeeSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceEventId" TEXT,
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderSchedule" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "offsetsMinutes" INTEGER[] NOT NULL DEFAULT ARRAY[10080, 1440, 120]::INTEGER[],
    "channels" TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
    "createdBy" TEXT NOT NULL,
    "lastProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReminderSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderDelivery" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReminderSchedule_eventId_key" ON "ReminderSchedule"("eventId");
CREATE INDEX "AttendeeSegment_eventId_idx" ON "AttendeeSegment"("eventId");
CREATE INDEX "AttendeeSegment_createdBy_idx" ON "AttendeeSegment"("createdBy");
CREATE INDEX "AttendeeSegment_updatedAt_idx" ON "AttendeeSegment"("updatedAt");
CREATE INDEX "EventTemplate_createdBy_idx" ON "EventTemplate"("createdBy");
CREATE INDEX "EventTemplate_updatedAt_idx" ON "EventTemplate"("updatedAt");
CREATE INDEX "ReminderSchedule_enabled_idx" ON "ReminderSchedule"("enabled");
CREATE INDEX "ReminderSchedule_updatedAt_idx" ON "ReminderSchedule"("updatedAt");
CREATE UNIQUE INDEX "ReminderDelivery_scheduleId_ticketId_channel_offsetMinutes_scheduledFor_key" ON "ReminderDelivery"("scheduleId", "ticketId", "channel", "offsetMinutes", "scheduledFor");
CREATE INDEX "ReminderDelivery_status_scheduledFor_idx" ON "ReminderDelivery"("status", "scheduledFor");
CREATE INDEX "ReminderDelivery_ticketId_idx" ON "ReminderDelivery"("ticketId");
CREATE INDEX "ReminderDelivery_scheduleId_createdAt_idx" ON "ReminderDelivery"("scheduleId", "createdAt");

ALTER TABLE "AttendeeSegment" ADD CONSTRAINT "AttendeeSegment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReminderSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
