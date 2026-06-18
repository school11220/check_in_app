'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribe to web-push notifications. Falls back gracefully when:
 *  - browser does not support Push API
 *  - user has denied permission
 *  - VAPID key is not configured
 *  - service worker is not registered
 */
export function usePushSubscription() {
    const [state, setState] = useState<'idle' | 'unsupported' | 'denied' | 'subscribed' | 'failed'>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            queueMicrotask(() => setState('unsupported'));
            return;
        }
        if (Notification.permission === 'denied') {
            queueMicrotask(() => setState('denied'));
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const reg = await navigator.serviceWorker.ready;
                const existing = await reg.pushManager.getSubscription();
                if (existing) {
                    if (!cancelled) queueMicrotask(() => setState('subscribed'));
                    return;
                }
                const vapidKeyRes = await fetch('/api/push/vapid');
                if (!vapidKeyRes.ok) {
                    if (!cancelled) setState('idle');
                    return;
                }
                const { publicKey } = await vapidKeyRes.json();
                if (!publicKey) {
                    if (!cancelled) queueMicrotask(() => setState('idle'));
                    return;
                }
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    if (!cancelled) queueMicrotask(() => setState('denied'));
                    return;
                }
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
                });
                const json = sub.toJSON();
                await fetch('/api/push/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: json.endpoint,
                        keys: json.keys,
                        userAgent: navigator.userAgent,
                    }),
                });
                if (!cancelled) queueMicrotask(() => setState('subscribed'));
            } catch (err: any) {
                if (!cancelled) {
                    queueMicrotask(() => {
                        setError(err?.message || 'Subscription failed');
                        setState('failed');
                    });
                }
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return { state, error };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
    return output;
}
