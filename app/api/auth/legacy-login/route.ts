import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import bcrypt from 'bcryptjs';

// This endpoint handles legacy database users
// It verifies credentials against local DB
// For users with passwords that meet Clerk requirements, it syncs them to Clerk
// For users with short passwords, it just returns success indicator to use custom session
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check if user exists in local database
        const dbUser = await prisma.user.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                }
            }
        });

        if (!dbUser) {
            return NextResponse.json({
                error: 'User not found. Please contact admin to be added.',
                exists: false
            }, { status: 404 });
        }

        // Check if user has a valid role
        const validRoles = ['ADMIN', 'ORGANIZER', 'SCANNER'];
        if (!dbUser.role || !validRoles.includes(dbUser.role)) {
            return NextResponse.json({
                error: 'Your account is not authorized. Please contact admin.',
                exists: true,
                unauthorized: true
            }, { status: 403 });
        }

        // 2. Verify password against database
        const passwordValid = await bcrypt.compare(password, dbUser.password);
        if (!passwordValid) {
            return NextResponse.json({
                error: 'Invalid password',
                exists: true
            }, { status: 401 });
        }

        // 3. Check if user already exists in Clerk
        const client = await clerkClient();
        const existingClerkUsers = await client.users.getUserList({ emailAddress: [normalizedEmail] });

        let clerkUserId: string | null = null;
        let useClerkAuth = false;

        if (existingClerkUsers.data.length > 0) {
            // User exists in Clerk - update their role and use Clerk auth
            clerkUserId = existingClerkUsers.data[0].id;
            await client.users.updateUser(clerkUserId, {
                publicMetadata: { role: dbUser.role }
            });
            useClerkAuth = true;
        } else if (password.length >= 8) {
            // User doesn't exist in Clerk but password is long enough - migrate them
            try {
                const username = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);
                const clerkUser = await client.users.createUser({
                    emailAddress: [normalizedEmail],
                    password: password,
                    username: username,
                    firstName: dbUser.name?.split(' ')[0] || '',
                    lastName: dbUser.name?.split(' ').slice(1).join(' ') || '',
                    publicMetadata: { role: dbUser.role }
                });
                clerkUserId = clerkUser.id;
                useClerkAuth = true;

                // Update local DB with new Clerk ID
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { id: clerkUserId }
                });
            } catch (clerkError: any) {
                console.log('Clerk migration failed, using DB auth:', clerkError.message);
                // Fall through to DB-only auth
            }
        }

        // If password is too short for Clerk or migration failed, use DB-only auth
        // Return user info for session creation
        return NextResponse.json({
            success: true,
            message: 'Authentication successful',
            useClerkAuth,
            clerkUserId,
            user: {
                id: clerkUserId || dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                assignedEventIds: dbUser.assignedEventIds || []
            }
        });

    } catch (error: any) {
        console.error('Legacy login error:', error);
        const msg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || error.message;
        return NextResponse.json({ error: msg || 'Login failed' }, { status: 500 });
    }
}
