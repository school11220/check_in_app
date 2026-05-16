/**
 * POST /api/admin/campaigns/process
 * Call this via a cron job (e.g. Vercel Cron `vercel.json`) or the admin
 * "Run Now" button.  It walks every active campaign and fires emails
 * for tickets that match each step's trigger condition and haven't been
 * sent that step's email yet.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail, isEmailConfigured } from '@/lib/email';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { PAID_LIKE_STATUSES } from '@/lib/ticket-lifecycle';

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.publicMetadata?.role as string) === 'ADMIN' ? userId : null;
}

const MS_PER_DAY = 86_400_000;

export async function POST(request: NextRequest) {
    // Allow cron secret OR admin session
    const cronSecret = request.headers.get('x-cron-secret');
    const validCron = cronSecret && cronSecret === process.env.CRON_SECRET;
    if (!validCron) {
        const uid = await requireAdmin();
        if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isEmailConfigured()) {
        return NextResponse.json({ error: 'Email not configured', notConfigured: true }, { status: 503 });
    }

    const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    const campaigns: any[] = ((config as any)?.campaigns ?? []).filter((c: any) => c.isActive);

    if (campaigns.length === 0) {
        return NextResponse.json({ success: true, processed: 0, message: 'No active campaigns' });
    }

    // Fetch sent log (persisted per-ticket per-step)
    const sentLog: Record<string, string[]> = (config as any)?.campaignSentLog ?? {};

    let totalSent = 0;
    const now = Date.now();

    for (const campaign of campaigns) {
        const event = await prisma.event.findUnique({ where: { id: campaign.eventId } });
        if (!event) continue;

        const eventTs = new Date(event.date).getTime();

        // Fetch all paid tickets for this event
        const tickets = await prisma.ticket.findMany({
            where: { eventId: campaign.eventId, status: { in: [...PAID_LIKE_STATUSES] }, email: { not: '' } },
        });

        // Fetch all email templates once
        const templates: any[] = (config as any)?.templates ?? [];

        for (const step of campaign.steps) {
            const stepKey = `${campaign.id}::${step.id ?? step.templateId}`;

            // Determine if this step should fire today for each ticket
            for (const ticket of tickets) {
                const ticketSentSteps: string[] = sentLog[ticket.id] ?? [];
                if (ticketSentSteps.includes(stepKey)) continue; // Already sent

                let shouldSend = false;

                if (step.triggerType === 'register') {
                    // Send on registration — if ticket was created <= 24 h ago
                    const createdAge = now - new Date(ticket.createdAt).getTime();
                    if (createdAge <= MS_PER_DAY) shouldSend = true;
                } else if (step.triggerType === 'daysBeforeEvent') {
                    // e.g. 7 days before event
                    const targetTime = eventTs - step.offsetDays * MS_PER_DAY;
                    const diff = Math.abs(now - targetTime);
                    if (diff <= MS_PER_DAY / 2) shouldSend = true; // within 12h window
                } else if (step.triggerType === 'daysAfterEvent') {
                    // e.g. 1 day after event  for survey
                    const targetTime = eventTs + step.offsetDays * MS_PER_DAY;
                    const diff = Math.abs(now - targetTime);
                    if (diff <= MS_PER_DAY / 2) shouldSend = true;
                }

                if (!shouldSend) continue;

                // Find template
                const template = templates.find((t: any) => t.id === step.templateId && t.isActive);
                if (!template) continue;

                // Variable substitution
                const vars: Record<string, string> = {
                    '{{name}}': ticket.name || 'Attendee',
                    '{{eventName}}': event.name,
                    '{{eventDate}}': new Date(event.date).toLocaleDateString('en-IN'),
                    '{{eventVenue}}': event.venue || 'TBA',
                    '{{ticketId}}': ticket.id,
                    '{{siteName}}': 'EventHub',
                };

                let subject = template.subject;
                let body = template.body;
                for (const [k, v] of Object.entries(vars)) {
                    subject = subject.replaceAll(k, v);
                    body = body.replaceAll(k, v);
                }

                const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#000;font-family:sans-serif;">
                  <div style="max-width:600px;margin:0 auto;background:#111;color:#fff;padding:24px;border-radius:12px;">
                    <h1 style="color:#fff;border-bottom:2px solid #222;padding-bottom:12px;">${event.name}</h1>
                    <div style="font-size:16px;line-height:1.7;color:#ccc;margin-top:20px;">${body.replace(/\n/g, '<br>')}</div>
                    <div style="margin-top:32px;font-size:12px;color:#555;border-top:1px solid #222;padding-top:12px;">
                      Sent automatically by EventHub campaign: <em>${campaign.name}</em>
                    </div>
                  </div>
                </body></html>`;

                const result = await sendTransactionalEmail({ to: ticket.email!, toName: ticket.name, subject, htmlContent: html });

                if (result.success) {
                    totalSent++;
                    sentLog[ticket.id] = [...ticketSentSteps, stepKey];
                }
            }
        }
    }

    // Persist updated sentLog
    await prisma.siteConfig.update({
        where: { id: 'default' },
        data: { campaignSentLog: sentLog } as any,
    });

    return NextResponse.json({ success: true, totalSent, message: `Processed campaigns, sent ${totalSent} emails` });
}
