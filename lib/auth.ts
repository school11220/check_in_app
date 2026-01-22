import { SignJWT, jwtVerify } from 'jose';
import { hash, compare } from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secure-jwt-secret-key-change-this-in-prod';
const key = new TextEncoder().encode(SECRET_KEY);

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function hashPassword(password: string) {
    return await hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
    return await compare(password, hash);
}

// Updated to use Clerk authentication
export async function getSession() {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        // Get user from Clerk
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const role = (clerkUser.publicMetadata?.role as string) || 'UNAUTHORIZED';

        if (role === 'UNAUTHORIZED') {
            return null;
        }

        // Get assignedEventIds from database if user exists there
        let assignedEventIds: string[] = [];
        try {
            const { prisma } = await import('@/lib/prisma');
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { assignedEventIds: true }
            });
            if (dbUser?.assignedEventIds) {
                assignedEventIds = dbUser.assignedEventIds;
            }
        } catch {
            // User might not exist in DB, that's ok
        }

        // Return session-like object for backward compatibility
        return {
            user: {
                id: userId,
                name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : clerkUser.emailAddresses[0]?.emailAddress,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                role: role,
                assignedEventIds: assignedEventIds,
            }
        };
    } catch (error) {
        console.error('getSession error:', error);
        return null;
    }
}

// Keep these for backward compatibility but they won't be used with Clerk
export async function login(userData: any) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await encrypt({ user: userData, expires });
    const cookieStore = await cookies();
    cookieStore.set('session', session, { expires, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return session;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', { expires: new Date(0) });
}

export async function updateSession(request: NextRequest) {
    const session = request.cookies.get('session')?.value;
    if (!session) return;

    const parsed = await decrypt(session);
    parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const res = NextResponse.next();
    res.cookies.set({
        name: 'session',
        value: await encrypt(parsed),
        httpOnly: true,
        expires: parsed.expires,
    });
    return res;
}
