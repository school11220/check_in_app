'use client';

import { useCallback, useEffect, useRef } from 'react';

export type ScanFeedbackKind = 'success' | 'duplicate' | 'error' | 'warning';

interface Options {
    /** Enable haptics on mobile. Default: true. */
    haptics?: boolean;
    /** Enable audio cue. Default: true. */
    audio?: boolean;
}

/**
 * Provides consistent vibration + audio feedback for the scanner / check-in
 * flows. Distinct patterns for success, duplicate, warning, and error.
 *
 * Audio uses files in /public/sounds/ and gracefully no-ops if the user has
 * denied audio autoplay.
 */
export function useScanFeedback(options: Options = {}) {
    const { haptics = true, audio = true } = options;
    const cacheRef = useRef<Map<ScanFeedbackKind, HTMLAudioElement | null>>(new Map());

    const getAudio = useCallback(
        (kind: ScanFeedbackKind): HTMLAudioElement | null => {
            if (!audio) return null;
            const cached = cacheRef.current.get(kind);
            if (cached !== undefined) return cached;
            const url = audioFor(kind);
            if (!url) {
                cacheRef.current.set(kind, null);
                return null;
            }
            try {
                const a = new Audio(url);
                a.preload = 'auto';
                cacheRef.current.set(kind, a);
                return a;
            } catch {
                cacheRef.current.set(kind, null);
                return null;
            }
        },
        [audio],
    );

    useEffect(() => {
        // Pre-warm audio so the first scan is instant.
        getAudio('success');
        getAudio('error');
    }, [getAudio]);

    return useCallback(
        (kind: ScanFeedbackKind) => {
            if (haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try {
                    navigator.vibrate(vibrationFor(kind));
                } catch {
                    /* ignore */
                }
            }
            const a = getAudio(kind);
            if (a) {
                try {
                    a.currentTime = 0;
                    a.play().catch(() => {
                        /* user gesture / autoplay policy */
                    });
                } catch {
                    /* ignore */
                }
            }
        },
        [haptics, getAudio],
    );
}

function vibrationFor(kind: ScanFeedbackKind): number | number[] {
    switch (kind) {
        case 'success':
            return 30;
        case 'duplicate':
            return [60, 40, 60];
        case 'warning':
            return 80;
        case 'error':
            return [100, 50, 100];
    }
}

function audioFor(kind: ScanFeedbackKind): string | null {
    switch (kind) {
        case 'success':
            return '/sounds/success.wav';
        case 'duplicate':
            return '/sounds/duplicate.wav';
        case 'error':
            return '/sounds/error.wav';
        case 'warning':
            return '/sounds/duplicate.wav';
    }
}
