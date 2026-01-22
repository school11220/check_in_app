import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Emergency password reset for admin users
// Usage: POST /api/auth/reset-password with { email, newPassword, secret }
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, newPassword, secret } = body;

        // Simple secret check - delete this file after use
        if (secret !== 'RESET_PASSWORD_2026') {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
        }

        if (!email || !newPassword) {
            return NextResponse.json({ error: 'Email and newPassword required' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Find user in database
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: { password: hashedPassword }
        });

        return NextResponse.json({
            success: true,
            message: `Password reset for ${email}. You can now login with the new password.`
        });

    } catch (error: any) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
