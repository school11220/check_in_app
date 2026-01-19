import { NextResponse } from 'next/server';
import { logout, getSession } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function POST() {
    // Get session before logout to log who logged out
    const session = await getSession();

    if (session) {
        await logAudit({
            action: 'LOGOUT',
            resource: 'AUTH',
            details: { email: session.user.email },
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userRole: session.user.role,
        });
    }

    await logout();
    return NextResponse.json({ success: true });
}
