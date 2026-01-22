import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import bcrypt from 'bcryptjs';

// This endpoint handles legacy database users
// It checks if user exists in DB, verifies password, then ensures they exist in Clerk
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // 1. Check if user exists in local database
        const dbUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!dbUser) {
            return NextResponse.json({
                error: 'User not found in database',
                exists: false
            }, { status: 404 });
        }

        // 2. Verify password against database
        const passwordValid = await bcrypt.compare(password, dbUser.password);
        if (!passwordValid) {
            return NextResponse.json({
                error: 'Invalid password',
                exists: true
            }, { status: 401 });
        }

        // 3. Check if user exists in Clerk
        const client = await clerkClient();
        const existingClerkUsers = await client.users.getUserList({ emailAddress: [email] });

        let clerkUserId: string;

        if (existingClerkUsers.data.length > 0) {
            // User exists in Clerk, just update their role metadata
            clerkUserId = existingClerkUsers.data[0].id;
            await client.users.updateUser(clerkUserId, {
                publicMetadata: { role: dbUser.role }
            });
        } else {
            // User doesn't exist in Clerk - create them (migrate)
            const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);
            const clerkUser = await client.users.createUser({
                emailAddress: [email],
                password: password,
                username: username,
                firstName: dbUser.name?.split(' ')[0] || '',
                lastName: dbUser.name?.split(' ').slice(1).join(' ') || '',
                publicMetadata: { role: dbUser.role }
            });
            clerkUserId = clerkUser.id;

            // Update local DB with new Clerk ID
            await prisma.user.update({
                where: { email: email.toLowerCase() },
                data: { id: clerkUserId }
            });
        }

        // Return success - frontend will now use Clerk's signIn
        return NextResponse.json({
            success: true,
            message: 'User verified and synced with Clerk. You can now sign in.',
            clerkUserId,
            role: dbUser.role
        });

    } catch (error: any) {
        console.error('Legacy login error:', error);
        const msg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
