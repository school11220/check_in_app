import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

// Define protected routes
const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isOrganizerRoute = createRouteMatcher(['/organizer(.*)']);
const isCheckinRoute = createRouteMatcher(['/checkin(.*)']);
const isLoginRoute = createRouteMatcher(['/login']);
const isSSOCallback = createRouteMatcher(['/sso-callback']);
const isApiRoute = createRouteMatcher(['/api(.*)']);
const isUnauthorizedRoute = createRouteMatcher(['/unauthorized']);

// Roles allowed to access check-in page
const CHECKIN_ALLOWED_ROLES = ['ADMIN', 'ORGANIZER', 'ORGANISER', 'SCANNER'];

export default clerkMiddleware(async (auth, request) => {
    const { userId } = await auth();

    // Allow SSO callback, API routes, and unauthorized page to proceed
    if (isSSOCallback(request) || isApiRoute(request) || isUnauthorizedRoute(request)) {
        return NextResponse.next();
    }

    // If not logged in and trying to access protected routes
    if (!userId) {
        if (isAdminRoute(request) || isOrganizerRoute(request) || isCheckinRoute(request)) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.next();
    }

    // Fetch fresh user data directly from Clerk API
    // Default role is now 'UNAUTHORIZED' instead of 'SCANNER'
    let role = 'UNAUTHORIZED';
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        role = (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
    } catch (error) {
        console.error('Failed to fetch user from Clerk:', error);
    }

    // If unauthorized, redirect to unauthorized page (unless already there)
    if (role === 'UNAUTHORIZED') {
        if (!isUnauthorizedRoute(request)) {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        return NextResponse.next();
    }

    // If logged in and on login/unauthorized page, redirect to dashboard
    if (isLoginRoute(request) || isUnauthorizedRoute(request)) {
        if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
        if (role === 'ORGANIZER' || role === 'ORGANISER') return NextResponse.redirect(new URL('/organizer', request.url));
        if (role === 'SCANNER') return NextResponse.redirect(new URL('/checkin', request.url));
        return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Role-based access control
    if (isAdminRoute(request)) {
        if (role !== 'ADMIN') {
            if (role === 'ORGANIZER' || role === 'ORGANISER') {
                return NextResponse.redirect(new URL('/organizer', request.url));
            }
            if (role === 'SCANNER') {
                return NextResponse.redirect(new URL('/checkin', request.url));
            }
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    if (isOrganizerRoute(request)) {
        if (role !== 'ADMIN' && role !== 'ORGANIZER' && role !== 'ORGANISER') {
            if (role === 'SCANNER') {
                return NextResponse.redirect(new URL('/checkin', request.url));
            }
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // Check-in route - ONLY admin, organizer, and scanner can access
    if (isCheckinRoute(request)) {
        if (!CHECKIN_ALLOWED_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // Add role header for client-side use
    const response = NextResponse.next();
    response.headers.set('x-user-role', role);
    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};