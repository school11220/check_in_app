import { prisma } from '@/lib/prisma';
import { isEmailConfigured, sendTransactionalEmail } from '@/lib/email';
import { isSMSConfigured, sendSMS } from '@/lib/sms';
import { isPaidLikeStatus } from '@/lib/ticket-lifecycle';

export const DEFAULT_REMINDER_OFFSETS = [10080, 1440, 120];
export const REMINDER_CHANNELS = ['email', 'sms'] as const;

export function getEventStart(date: Date, startTime: string, timezoneOffsetMinutes = 330) {
  const [hours, minutes] = (startTime || '09:00').split(':').map(Number);
  return new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
    Number.isFinite(hours) ? hours : 9,
    Number.isFinite(minutes) ? minutes : 0,
  ) - timezoneOffsetMinutes * 60_000);
}

export function reminderScheduledFor(eventStart: Date, offsetMinutes: number) {
  return new Date(eventStart.getTime() - offsetMinutes * 60_000);
}

export function reminderOffsetLabel(offsetMinutes: number) {
  if (offsetMinutes % 1440 === 0) return `${offsetMinutes / 1440} day${offsetMinutes === 1440 ? '' : 's'}`;
  if (offsetMinutes % 60 === 0) return `${offsetMinutes / 60} hour${offsetMinutes === 60 ? '' : 's'}`;
  return `${offsetMinutes} minutes`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char] || char);
}

export async function processDueReminders(now = new Date()) {
  const timezoneOffset = Number(process.env.REMINDER_TIMEZONE_OFFSET_MINUTES || 330);
  const graceMinutes = Math.max(15, Number(process.env.REMINDER_GRACE_MINUTES || 60));
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const schedules = await prisma.reminderSchedule.findMany({
    where: { enabled: true, Event: { isActive: true, sendReminders: true, date: { gte: startOfToday } } },
    include: {
      Event: {
        include: {
          Ticket: {
            where: { status: { in: ['paid', 'partially_refunded'] } },
            select: { id: true, name: true, email: true, phone: true, status: true, token: true },
          },
        },
      },
    },
  });

  let queued = 0;
  for (const schedule of schedules) {
    const eventStart = getEventStart(schedule.Event.date, schedule.Event.startTime, timezoneOffset);
    const candidates: Array<{ scheduleId: string; ticketId: string; channel: string; offsetMinutes: number; scheduledFor: Date }> = [];
    for (const offsetMinutes of schedule.offsetsMinutes) {
      const scheduledFor = reminderScheduledFor(eventStart, offsetMinutes);
      // Persist future work early so a temporary cron outage cannot lose it. A
      // newly created schedule may also catch up inside the bounded grace window.
      if (scheduledFor < new Date(now.getTime() - graceMinutes * 60_000)) continue;
      for (const ticket of schedule.Event.Ticket) {
        if (!isPaidLikeStatus(ticket.status)) continue;
        for (const channel of schedule.channels.filter((item) => REMINDER_CHANNELS.includes(item as typeof REMINDER_CHANNELS[number]))) {
          if ((channel === 'email' && !ticket.email) || (channel === 'sms' && !ticket.phone)) continue;
          candidates.push({ scheduleId: schedule.id, ticketId: ticket.id, channel, offsetMinutes, scheduledFor });
        }
      }
    }
    if (candidates.length) {
      queued += (await prisma.reminderDelivery.createMany({ data: candidates, skipDuplicates: true })).count;
    }
    await prisma.reminderSchedule.update({ where: { id: schedule.id }, data: { lastProcessedAt: now } });
  }

  const staleProcessing = new Date(now.getTime() - 10 * 60_000);
  await prisma.reminderDelivery.updateMany({
    where: { status: 'processing', lastAttemptAt: { lt: staleProcessing }, attempts: { lt: 3 } },
    data: { status: 'pending' },
  });

  const due = await prisma.reminderDelivery.findMany({
    where: {
      status: { in: ['pending', 'failed'] }, attempts: { lt: 3 }, scheduledFor: { lte: now },
      Ticket: { status: { in: ['paid', 'partially_refunded'] } },
      Schedule: { enabled: true, Event: { isActive: true, sendReminders: true } },
    },
    include: { Ticket: true, Schedule: { include: { Event: true } } },
    orderBy: { scheduledFor: 'asc' },
    take: 100,
  });

  let sent = 0;
  let failed = 0;
  for (const delivery of due) {
    const currentEventStart = getEventStart(delivery.Schedule.Event.date, delivery.Schedule.Event.startTime, timezoneOffset);
    const expectedTime = reminderScheduledFor(currentEventStart, delivery.offsetMinutes).getTime();
    const stillValid = currentEventStart > now
      && delivery.Schedule.offsetsMinutes.includes(delivery.offsetMinutes)
      && delivery.Schedule.channels.includes(delivery.channel)
      && expectedTime === delivery.scheduledFor.getTime();
    if (!stillValid) {
      await prisma.reminderDelivery.update({
        where: { id: delivery.id },
        data: { status: 'cancelled', error: 'Schedule, channel, or event time changed before delivery' },
      });
      continue;
    }
    const claimed = await prisma.reminderDelivery.updateMany({
      where: { id: delivery.id, status: { in: ['pending', 'failed'] }, attempts: delivery.attempts },
      data: { status: 'processing', attempts: { increment: 1 }, lastAttemptAt: now, error: null },
    });
    if (!claimed.count) continue;

    const event = delivery.Schedule.Event;
    const dateLabel = currentEventStart.toLocaleString('en-IN', {
      dateStyle: 'full', timeStyle: 'short', timeZone: process.env.REMINDER_TIMEZONE || 'Asia/Kolkata',
    });
    const lead = reminderOffsetLabel(delivery.offsetMinutes);
    let result: { success: boolean; error?: string };

    if (delivery.channel === 'email') {
      if (!delivery.Ticket.email || !isEmailConfigured()) {
        result = { success: false, error: 'Email recipient or provider is not configured' };
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const ticketUrl = `${baseUrl}/ticket/${delivery.Ticket.id}?token=${encodeURIComponent(delivery.Ticket.token || '')}`;
        result = await sendTransactionalEmail({
          to: delivery.Ticket.email,
          toName: delivery.Ticket.name,
          subject: `Reminder: ${event.name} starts in ${lead}`,
          htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px"><h1>${escapeHtml(event.name)}</h1><p>Hi ${escapeHtml(delivery.Ticket.name)},</p><p>This is your reminder that the event starts in <strong>${lead}</strong>.</p><p><strong>${escapeHtml(dateLabel)}</strong><br>${escapeHtml(event.venue || 'Venue to be announced')}</p><p><a href="${ticketUrl}">Open your ticket</a></p></div>`,
        });
      }
    } else if (delivery.channel === 'sms') {
      if (!delivery.Ticket.phone || !isSMSConfigured()) {
        result = { success: false, error: 'SMS recipient or provider is not configured' };
      } else {
        result = await sendSMS({
          to: delivery.Ticket.phone,
          message: `Reminder: ${event.name} starts in ${lead} on ${dateLabel} at ${event.venue || 'the announced venue'}. Ticket ${delivery.Ticket.id.slice(-8).toUpperCase()}.`,
        });
      }
    } else {
      result = { success: false, error: 'Unsupported reminder channel' };
    }

    await prisma.$transaction([
      prisma.reminderDelivery.update({
        where: { id: delivery.id },
        data: result.success
          ? { status: 'sent', sentAt: new Date(), error: null }
          : { status: 'failed', error: (result.error || 'Delivery failed').slice(0, 1000) },
      }),
      prisma.ticketDeliveryLog.create({
        data: {
          ticketId: delivery.Ticket.id,
          channel: `reminder-${delivery.channel}`,
          recipient: delivery.channel === 'email' ? delivery.Ticket.email : delivery.Ticket.phone,
          success: result.success,
          error: result.error || null,
          requestedBy: 'reminder-worker',
        },
      }),
    ]);
    result.success ? sent += 1 : failed += 1;
  }

  return { schedules: schedules.length, queued, attempted: due.length, sent, failed };
}
