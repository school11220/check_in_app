'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { openDB, IDBPDatabase } from 'idb';
import { offlineCheckIn, processBackgroundSync } from '@/lib/offline-sync';

interface UseOfflineSyncReturn {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    doOfflineCheckin: (ticketId: string, eventId: string) => Promise<{ success: boolean; error?: string }>;
    syncNow: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
    const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const dbRef = useRef<IDBPDatabase | null>(null);

    // Open IDB and read pending count
    const refreshPending = useCallback(async () => {
        try {
            const db = await openDB('offline-checkin', 1, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('pending_logs')) {
                        db.createObjectStore('pending_logs', { keyPath: 'ticketId' });
                    }
                },
            });
            dbRef.current = db;
            const all = await db.getAll('pending_logs');
            setPendingCount(all.length);
        } catch { /* IDB not available (e.g., SSR) */ }
    }, []);

    useEffect(() => {
        refreshPending();

        const handleOnline = () => {
            setIsOnline(true);
            handleSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSync = useCallback(async () => {
        setIsSyncing(true);
        try {
            await processBackgroundSync();
            // Also try registering background sync via SW
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                const reg = await navigator.serviceWorker.ready;
                await (reg as any).sync.register('checkin-sync');
            }
            await refreshPending();
        } finally {
            setIsSyncing(false);
        }
    }, [refreshPending]);

    const doOfflineCheckin = useCallback(async (ticketId: string, eventId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            await offlineCheckIn(ticketId, eventId);
            await refreshPending();
            // Register background sync tag immediately
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                try {
                    const reg = await navigator.serviceWorker.ready;
                    await (reg as any).sync.register('checkin-sync');
                } catch { /* background sync not supported */ }
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err?.message || 'Offline check-in failed' };
        }
    }, [refreshPending]);

    return { isOnline, pendingCount, isSyncing, doOfflineCheckin, syncNow: handleSync };
}
