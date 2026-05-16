import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { sendCertificateEmail } from '@/lib/ticket-email';
import { PAID_LIKE_STATUSES } from '@/lib/ticket-lifecycle';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify Admin Role
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const role = (user.publicMetadata?.role as string) || '';
        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { eventId, filter = 'checked-in', limit = 50 } = await req.json();

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        // Load Certificate Template
        const template = await prisma.certificateTemplate.findUnique({
            where: { eventId }
        });

        // Find target tickets
        const where: any = {
            eventId,
            status: { in: [...PAID_LIKE_STATUSES, 'checked_in'] },
            certificateSent: false, // Don't resend
        };

        if (filter === 'checked-in') {
            where.checkedIn = true;
        }

        const tickets = await prisma.ticket.findMany({
            where,
            take: limit,
            include: { Event: true }
        });

        if (tickets.length === 0) {
            return NextResponse.json({ message: 'No eligible tickets found for certificate issuance' });
        }

        // Process in batches
        const results = {
            total: tickets.length,
            sent: 0,
            failed: 0,
        };

        // Load site settings for styles
        const siteConfig = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
        const siteSettings = siteConfig?.settings as any || {};
        const emailStyles = {
            accentColor: siteSettings.ticketAccentColor,
            // ... other styles map if needed
        };

        for (const ticket of tickets) {
            try {
                if (!ticket.email) continue;

                await sendCertificateEmail({
                    to: ticket.email,
                    ticketId: ticket.id,
                    token: ticket.token || ticket.id,
                    eventName: ticket.Event.name,
                    attendeeName: ticket.name,
                    eventDate: ticket.Event.date.toISOString(), // formatting handled nicely inside lib
                    venue: ticket.Event.venue || '',
                    amountPaid: 0, // Not needed for cert
                    transactionId: '',
                    orderId: '',
                    emailStyles,
                    certificateTemplate: template || undefined
                });

                // Update status
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { certificateSent: true }
                });

                results.sent++;
            } catch (error) {
                console.error(`Failed to send certificate to ticket ${ticket.id}`, error);
                results.failed++;
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `Processed ${results.total} tickets. Sent: ${results.sent}, Failed: ${results.failed}`
        });

    } catch (error) {
        console.error('Certificate bulk send error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
