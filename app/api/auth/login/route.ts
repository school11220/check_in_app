import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { login, verifyPassword } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            // Log failed login attempt
            await logAudit({
                action: 'LOGIN',
                resource: 'AUTH',
                details: { email, success: false, reason: 'Invalid password' },
                userId: user.id,
                userName: user.name || user.email,
                userRole: user.role,
            });
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create session
        await login({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            assignedEventIds: user.assignedEventIds
        });

        // Log successful login
        await logAudit({
            action: 'LOGIN',
            resource: 'AUTH',
            details: { email, success: true, role: user.role },
            userId: user.id,
            userName: user.name || user.email,
            userRole: user.role,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
