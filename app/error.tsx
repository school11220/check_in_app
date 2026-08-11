'use client';

import { useEffect } from 'react';
import ErrorState from '@/components/ErrorState';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return <ErrorState kind="error" onRetry={reset} digest={error.digest} />;
}
