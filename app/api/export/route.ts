import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const eventId = url.searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const tickets = await prisma.ticket.findMany({
            where: { eventId },
            orderBy: { createdAt: 'desc' },
        });

        // Prepare Headers
        const standardHeaders = ['Ticket ID', 'Name', 'Email', 'Phone', 'Status', 'Checked In', 'Purchase Date'];

        // Extract custom question labels
        const registrationFields = (event.registrationFields as any[]) || [];
        const customHeaders = registrationFields.map(field => field.label);

        const csvRows = [
            [...standardHeaders, ...customHeaders].join(',')
        ];

        // Generate Rows
        for (const ticket of tickets) {
            const answers = (ticket.customAnswers as Record<string, any>) || {};

            const row = [
                ticket.id,
                JSON.stringify(ticket.name).replace(/^"|"$/g, ''), // Escape quotes if needed, simplified here
                ticket.email,
                ticket.phone || '',
                ticket.status,
                ticket.checkedIn ? 'Yes' : 'No',
                new Date(ticket.createdAt).toISOString()
            ];

            // Add custom answers in order of headers
            for (const field of registrationFields) {
                let answer = answers[field.id] || '';
                // Handle commas in answers by wrapping in quotes
                if (typeof answer === 'string' && answer.includes(',')) {
                    answer = `"${answer}"`;
                }
                row.push(answer);
            }

            csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="tickets-${eventId}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
    }
}
