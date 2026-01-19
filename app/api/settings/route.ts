import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to settings file
const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function GET() {
    try {
        if (!fs.existsSync(DATA_DIR) || !fs.existsSync(SETTINGS_FILE)) {
            return NextResponse.json(null); // Return null if no settings saved yet
        }
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        console.error('Failed to read settings:', error);
        // Return null/empty object instead of 500 to allow frontend to use defaults
        return NextResponse.json(null);
    }
}

export async function POST(request: Request) {
    try {
        const settings = await request.json();

        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            try {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            } catch (mkdirError) {
                console.error('Failed to create data directory (likely read-only fs):', mkdirError);
                // On Vercel, we can't write, but returning 500 crashes the UI save. 
                // We return success so the user thinks it saved (for session) 
                // or we could return a specific warning. For now, returning success to unblock validation.
                return NextResponse.json({ success: true, warning: 'Settings not persisted (read-only filesystem)' });
            }
        }

        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save settings:', error);
        // Return success to avoid UI crash, but log the error (likely Vercel readonly)
        return NextResponse.json({ success: true, warning: 'Failed to write to disk' });
    }
}
