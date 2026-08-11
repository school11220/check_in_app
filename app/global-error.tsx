'use client';

import { useEffect } from 'react';
import ErrorState from '@/components/ErrorState';
import './globals.css';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Root application error:', error);
    }, [error]);

    return (
        <html lang="en" className="dark">
            <body>
                <ErrorState kind="error" onRetry={reset} digest={error.digest} />
            </body>
        </html>
    );
}
