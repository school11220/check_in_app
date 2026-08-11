'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from '@/components/icons';

type ErrorStateProps = {
    kind: 'not-found' | 'error';
    onRetry?: () => void;
    digest?: string;
};

export default function ErrorState({ kind, onRetry, digest }: ErrorStateProps) {
    const isNotFound = kind === 'not-found';

    return (
        <main className="error-page min-h-screen flex items-center justify-center px-4 py-12">
            <section
                role="alert"
                aria-labelledby="error-title"
                className="error-card w-full max-w-lg overflow-hidden"
            >
                <div className="error-card-header flex items-center justify-between gap-4 px-5 py-4">
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">
                        EventHub / {isNotFound ? '404' : 'system error'}
                    </span>
                    <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
                </div>

                <div className="px-5 py-8 sm:px-8 sm:py-10">
                    <p className="error-code mb-3 font-mono text-5xl font-bold" aria-hidden="true">
                        {isNotFound ? '404' : '500'}
                    </p>
                    <h1 id="error-title" className="mb-3 text-2xl font-bold sm:text-3xl">
                        {isNotFound ? 'That page is off the guest list' : 'Something went wrong'}
                    </h1>
                    <p className="error-copy mb-8 max-w-md text-sm leading-6">
                        {isNotFound
                            ? "The link may be outdated, or the page may have moved. Let’s get you back to an EventHub starting point."
                            : 'The page hit an unexpected problem. You can retry the request or return to the EventHub home page.'}
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        {!isNotFound && onRetry ? (
                            <button type="button" onClick={onRetry} className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold">
                                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                                Try again
                            </button>
                        ) : null}
                        <Link href="/" className="btn-ghost inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold">
                            <Home aria-hidden="true" className="h-4 w-4" />
                            Go home
                        </Link>
                        <button type="button" onClick={() => window.history.back()} className="error-back inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold">
                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                            Go back
                        </button>
                    </div>

                    {!isNotFound && digest ? (
                        <p className="mt-6 font-mono text-[11px]" aria-label="Error reference">
                            Ref: {digest}
                        </p>
                    ) : null}
                </div>
            </section>
        </main>
    );
}
