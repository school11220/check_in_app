'use client';

import { useEffect, useState } from 'react';
import { Download, X } from '@/components/icons';

const STORAGE_KEY = 'eh-install-dismissed-v1';
const STORAGE_INSTALLED_KEY = 'eh-install-installed-v1';

// Minimal type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallPrompt() {
    const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Hide if user previously dismissed or already installed.
        try {
            if (localStorage.getItem(STORAGE_INSTALLED_KEY) === '1') return;
            if (localStorage.getItem(STORAGE_KEY)) return;
        } catch {
            // ignore
        }

        const onBefore = (e: Event) => {
            e.preventDefault();
            setEvent(e as BeforeInstallPromptEvent);
            // Only show after the user has spent some time on the site so
            // it doesn't pop up instantly.
            setTimeout(() => setVisible(true), 5000);
        };

        const onInstalled = () => {
            try {
                localStorage.setItem(STORAGE_INSTALLED_KEY, '1');
            } catch {
                // ignore
            }
            setVisible(false);
        };

        window.addEventListener('beforeinstallprompt', onBefore);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBefore);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!visible || !event) return null;

    const install = async () => {
        try {
            await event.prompt();
            const choice = await event.userChoice;
            if (choice.outcome === 'accepted') {
                try {
                    localStorage.setItem(STORAGE_INSTALLED_KEY, '1');
                } catch {
                    // ignore
                }
            }
        } catch {
            // ignore — some browsers reject calls to prompt outside a user gesture
        }
        setVisible(false);
    };

    const dismiss = () => {
        try {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch {
            // ignore
        }
        setVisible(false);
    };

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Install EventHub"
            className="fixed bottom-4 right-4 z-40 hidden sm:flex items-center gap-3 bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-2xl shadow-2xl px-4 py-3 text-sm text-zinc-200 max-w-sm"
        >
            <Download className="w-5 h-5 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-white font-medium leading-tight">Install EventHub</p>
                <p className="text-zinc-400 text-xs leading-tight">Add to home screen for one-tap check-in.</p>
            </div>
            <button
                onClick={install}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
            >
                Install
            </button>
            <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="text-zinc-500 hover:text-white p-1"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
