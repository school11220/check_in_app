'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page catches users who try to sign up via Clerk
// Since we don't allow public sign-ups, redirect to unauthorized
export default function SignUpPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to unauthorized page - no public sign-ups allowed
        router.replace('/unauthorized');
    }, [router]);

    return (
        <main className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#E11D2E] mx-auto mb-4" />
                <p className="text-[#737373] text-sm">Redirecting...</p>
            </div>
        </main>
    );
}
