import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value;
    const path = request.nextUrl.pathname;

    // Public paths that don't need auth
    const isPublicPath = path === '/login' || path === '/';

    // If trying to access protected routes
    if (path.startsWith('/admin') || path.startsWith('/checkin') || path.startsWith('/organizer')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const payload = await decrypt(session);
        if (!payload?.user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const role = payload.user.role;

        // Checkin route Access (All roles)
        if (path.startsWith('/checkin')) {
            return NextResponse.next();
        }

        // Organizer route Access (ADMIN, ORGANIZER)
        if (path.startsWith('/organizer')) {
            if (role !== 'ADMIN' && role !== 'ORGANIZER') {
                return NextResponse.redirect(new URL('/checkin', request.url));
            }
            return NextResponse.next();
        }

        // Admin route Access (ADMIN only)
        if (path.startsWith('/admin')) {
            if (role !== 'ADMIN') {
                if (role === 'ORGANIZER') {
                    return NextResponse.redirect(new URL('/organizer', request.url));
                }
                return NextResponse.redirect(new URL('/checkin', request.url));
            }
        }
    }

    // If logged in and trying to access login, redirect based on role
    if (path === '/login' && session) {
        const payload = await decrypt(session);
        if (payload?.user) {
            if (payload.user.role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
            if (payload.user.role === 'ORGANIZER') return NextResponse.redirect(new URL('/organizer', request.url));
            return NextResponse.redirect(new URL('/checkin', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/checkin/:path*', '/organizer/:path*', '/login'],
};
