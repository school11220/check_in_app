import { NextRequest, NextResponse } from 'next/server';
import { googleSheetsService } from '@/lib/google-sheets';
import { respond, parseBody, badRequest } from '@/lib/api-helpers';
import { surveySubmitBody } from '@/lib/api-helpers/schemas';

export const POST = respond(
    async (request: NextRequest) => {
        const data = await parseBody(request, surveySubmitBody);
        if (!data.answers || data.answers.length === 0) {
            throw badRequest('No answers provided');
        }

        // Prepare data row
        // We include metadata like timestamp, surveyId, respondent info
        const rowData: Record<string, string | number | boolean> = {
            timestamp: new Date().toISOString(),
            surveyId: data.surveyId,
            ...(data.respondentName ? { respondentName: data.respondentName } : {}),
            ...(data.respondentEmail ? { respondentEmail: data.respondentEmail } : {}),
        };
        for (const a of data.answers) {
            rowData[a.questionId] = a.value as string | number | boolean;
        }

        // Try to save to Google Sheets
        try {
            // Note: addRow automatically initializes if needed, using the config from DB
            await googleSheetsService.addRow(rowData);
            return NextResponse.json({ success: true, message: 'Survey submitted and synced to Sheets' });
        } catch (sheetError: any) {
            console.error('Google Sheets sync error:', sheetError);

            // If connection failure, return specific error
            if (sheetError.message?.includes('not enabled') || sheetError.message?.includes('Invalid')) {
                return NextResponse.json(
                    { success: false, error: `Google Sheets integration error: ${sheetError.message}` },
                    { status: 500 },
                );
            }

            return NextResponse.json(
                { success: false, error: 'Failed to sync with Google Sheets' },
                { status: 500 },
            );
        }
    },
    { public: true },
);
