'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <h1 className="text-2xl font-semibold text-white mb-3">Something went wrong</h1>
                <p className="text-zinc-400 text-sm mb-6">{error.message || 'An unexpected error occurred.'}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-5 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 font-medium"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
