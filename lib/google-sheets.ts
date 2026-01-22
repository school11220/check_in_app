import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { prisma } from '@/lib/prisma';

export class GoogleSheetsService {
    private doc: GoogleSpreadsheet | null = null;

    async initialize(sheetId?: string) {
        // Fetch credentials from DB integration
        const integration = await prisma.integration.findUnique({
            where: { provider: 'google_sheets' }
        });

        if (!integration || !integration.isEnabled || !integration.config) {
            throw new Error('Google Sheets integration not enabled or configured');
        }

        const config = integration.config as any;

        // Support both naming conventions (UI input vs Generic JSON)
        const serviceAccountEmail = config.serviceAccountEmail || config.client_email;
        const privateKey = config.privateKey || config.private_key;
        const configuredSheetId = config.sheetId || sheetId;

        if (!serviceAccountEmail || !privateKey) {
            throw new Error('Invalid Google Sheets credentials in configuration');
        }

        if (!configuredSheetId) {
            throw new Error('No Google Sheet ID configured');
        }

        const jwt = new JWT({
            email: serviceAccountEmail,
            key: privateKey.replace(/\\n/g, '\n'), // Ensure newlines are correctly formatted
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.doc = new GoogleSpreadsheet(configuredSheetId, jwt);
        await this.doc.loadInfo();
    }

    async addRow(data: Record<string, string | number | boolean>, sheetId?: string) {
        if (!this.doc) await this.initialize(sheetId);
        if (!this.doc) throw new Error('Failed to initialize Google Sheet');

        const sheet = this.doc.sheetsByIndex[0]; // Use first sheet by default
        await sheet.addRow(data);
    }
}

export const googleSheetsService = new GoogleSheetsService();
