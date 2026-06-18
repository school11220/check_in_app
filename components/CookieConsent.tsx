'use client';

import { useEffect, useState } from 'react';
import { X } from '@/components/icons';

const STORAGE_KEY = 'eh-cookie-consent-v1';

type Consent = {
    necessary: true; // always true
    analytics: boolean;
    marketing: boolean;
    decidedAt: string;
};

function readConsent(): Consent | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Consent) : null;
    } catch {
        return null;
    }
}

function writeConsent(c: Consent) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    } catch {
        // ignore quota errors
    }
    // Fire a CustomEvent so other parts of the app can react.
    window.dispatchEvent(new CustomEvent('eh:cookie-consent', { detail: c }));
}

export function getStoredConsent(): Consent | null {
    return readConsent();
}

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [analytics, setAnalytics] = useState(true);
    const [marketing, setMarketing] = useState(false);

    useEffect(() => {
        const existing = readConsent();
        if (!existing) {
            // Small delay so it doesn't pop immediately on first paint.
            const t = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    if (!visible) return null;

    const acceptAll = () => {
        const c: Consent = { necessary: true, analytics: true, marketing: true, decidedAt: new Date().toISOString() };
        writeConsent(c);
        setVisible(false);
    };
    const rejectNonEssential = () => {
        const c: Consent = { necessary: true, analytics: false, marketing: false, decidedAt: new Date().toISOString() };
        writeConsent(c);
        setVisible(false);
    };
    const saveCustom = () => {
        const c: Consent = { necessary: true, analytics, marketing, decidedAt: new Date().toISOString() };
        writeConsent(c);
        setVisible(false);
    };

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Cookie consent"
            className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-2xl shadow-2xl p-4 text-sm text-zinc-200"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-white font-semibold mb-1">Cookies on EventHub</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                        We use essential cookies to keep you signed in and the app working. With your permission we&apos;ll also use analytics cookies to improve the experience. You can change this anytime.
                    </p>
                </div>
                <button
                    onClick={rejectNonEssential}
                    aria-label="Dismiss"
                    className="text-zinc-500 hover:text-white p-1"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {showDetails && (
                <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                    <label className="flex items-start gap-2 text-xs">
                        <input type="checkbox" checked readOnly className="mt-0.5" />
                        <span>
                            <span className="text-white">Essential</span>
                            <span className="block text-zinc-500">Required for sign-in, security, and saving your preferences.</span>
                        </span>
                    </label>
                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={analytics}
                            onChange={(e) => setAnalytics(e.target.checked)}
                            className="mt-0.5"
                        />
                        <span>
                            <span className="text-white">Analytics</span>
                            <span className="block text-zinc-500">Anonymous usage stats so we can fix bugs faster.</span>
                        </span>
                    </label>
                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={marketing}
                            onChange={(e) => setMarketing(e.target.checked)}
                            className="mt-0.5"
                        />
                        <span>
                            <span className="text-white">Marketing</span>
                            <span className="block text-zinc-500">Personalised event recommendations. Off by default.</span>
                        </span>
                    </label>
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                    onClick={acceptAll}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                >
                    Accept all
                </button>
                <button
                    onClick={rejectNonEssential}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
                >
                    Essential only
                </button>
                <button
                    onClick={() => setShowDetails((v) => !v)}
                    className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white text-xs"
                >
                    {showDetails ? 'Hide' : 'Customize'}
                </button>
                {showDetails && (
                    <button
                        onClick={saveCustom}
                        className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium ml-auto"
                    >
                        Save choices
                    </button>
                )}
            </div>
        </div>
    );
}
