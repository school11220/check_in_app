import { NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/google-sheets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { surveyId, eventId, answers } = body;

        if (!answers) {
            return NextResponse.json({ error: 'No answers provided' }, { status: 400 });
        }

        // Prepare data row
        // We include metadata like timestamp, surveyId, eventId
        const rowData = {
            timestamp: new Date().toISOString(),
            surveyId: surveyId || 'unknown',
            eventId: eventId || 'unknown',
            ...answers
        };

        // Try to save to Google Sheets
        try {
            // Note: addRow automatically initializes if needed, using the config from DB
            await googleSheetsService.addRow(rowData);
            return NextResponse.json({ success: true, message: 'Survey submitted and synced to Sheets' });
        } catch (sheetError: any) {
            console.error('Google Sheets sync error:', sheetError);

            // If connection failure, we return specific error
            if (sheetError.message.includes('not enabled') || sheetError.message.includes('Invalid')) {
                return NextResponse.json({
                    success: false,
                    error: `Google Sheets integration error: ${sheetError.message}`
                }, { status: 500 }); // Or 503 Service Unavailable
            }

            return NextResponse.json({
                success: false,
                error: 'Failed to sync with Google Sheets'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Survey submission error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
