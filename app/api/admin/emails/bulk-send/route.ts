import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail, isEmailConfigured } from '@/lib/email';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Admin Session with Clerk
        const { userId, sessionClaims } = await auth();
        const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

        if (!userId || role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Request
        const body = await request.json();
        const { eventId, templateId, templateType, surveyId } = body;

        if (!eventId || (!templateId && !templateType)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }


        // 3. Fetch Event
        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // 4. Fetch Template details
        // We'll use the 'default' site config to find the template
        const siteConfig = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
        let subject = '';
        let bodyContent = '';

        if (siteConfig?.templates) {
            const templates = siteConfig.templates as any[];
            const template = templates.find(t =>
                t.id === templateId ||
                (t.type === templateType && t.isActive)
            );
            if (template) {
                subject = template.subject;
                bodyContent = template.body;
            }
        }

        if (!subject && templateType === 'reminder') {
            subject = `Reminder: ${event.name} is coming up!`;
            bodyContent = `Hi {{name}}, \n\nThis is a reminder that you have a ticket for {{eventName}} on {{eventDate}}. \n\nSee you there!`;
        } else if (!subject) {
            return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 });
        }

        // 5. Fetch Attendees (Paid Tickets)
        const tickets = await prisma.ticket.findMany({
            where: {
                eventId: eventId,
                status: 'paid', // Only send to confirmed attendees
                email: { not: '' }
            }
        });

        if (tickets.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'No attendees found to email.' });
        }

        // 6. Send Emails (with concurrency limit)
        // We reuse the /api/email/send logic's core function or reimplement simpler version here
        // To ensure consistency, we'll construct the HTML here similarly

        let sentCount = 0;
        let diff = 0;

        // Process in chunks of 10 to avoid rate limits
        const CHUNK_SIZE = 10;
        for (let i = 0; i < tickets.length; i += CHUNK_SIZE) {
            const chunk = tickets.slice(i, i + CHUNK_SIZE);

            await Promise.all(chunk.map(async (ticket) => {
                try {
                    if (!ticket.email) return;

                    // Basic variable replacement
                    let finalSubject = subject;
                    let finalBody = bodyContent;

                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                    const surveyUrl = surveyId ? `${baseUrl}/survey/${surveyId}` : '#';
                    const surveyLinkHtml = surveyId ? `<a href="${surveyUrl}" style="color: #4ade80; text-decoration: underline;">Take our 1-minute survey</a>` : '';

                    const variables: Record<string, string> = {
                        '{{name}}': ticket.name,
                        '{{eventName}}': event.name,
                        '{{eventDate}}': new Date(event.date).toLocaleDateString('en-IN'),
                        '{{eventVenue}}': event.venue || 'TBA',
                        '{{ticketId}}': ticket.id,
                        '{{surveyLink}}': surveyLinkHtml
                    };

                    Object.keys(variables).forEach(key => {
                        finalSubject = finalSubject.replace(new RegExp(key, 'g'), variables[key]);
                        finalBody = finalBody.replace(new RegExp(key, 'g'), variables[key]);
                    });

                    // Prepare HTML
                    const emailHtml = `
                      <!DOCTYPE html>
                      <html>
                        <body style="margin: 0; padding: 0; background-color: #000000; font-family: sans-serif;">
                          <div style="max-width: 600px; margin: 0 auto; background-color: #111; color: #fff; padding: 20px;">
                               <h1 style="color: #fff; border-bottom: 2px solid #333; padding-bottom: 10px;">${event.name}</h1>
                               <div style="font-size: 16px; line-height: 1.6; color: #ccc; margin-top: 20px;">
                                    ${finalBody.replace(/\n/g, '<br>')}
                               </div>
                               <div style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #333; padding-top: 10px;">
                                    Sent via EventHub
                               </div>
                          </div>
                        </body>
                      </html>
                    `;

                    await sendTransactionalEmail({
                        to: ticket.email,
                        toName: ticket.name,
                        subject: finalSubject,
                        htmlContent: emailHtml
                    });
                    sentCount++;
                } catch (e) {
                    console.error(`Failed to email ticket ${ticket.id}`, e);
                }
            }));
        }

        return NextResponse.json({
            success: true,
            count: sentCount,
            total: tickets.length,
            message: `Emails sent to ${sentCount} attendees`
        });

    } catch (error) {
        console.error('Bulk send error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
