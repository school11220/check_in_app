'use client';

import { useEffect, useState } from 'react';
import { CloudOff, Loader2 } from 'lucide-react';
import { subscribePendingCount, processBackgroundSync } from '@/lib/offline-sync';

/**
 * Small "pending sync (N)" pill that lives in the scanner / check-in header.
 * Hidden when there is nothing to sync.
 */
export default function OfflineSyncPill() {
    const [count, setCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const unsub = subscribePendingCount(setCount);
        return unsub;
    }, []);

    if (count === 0) return null;

    const onClick = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            await processBackgroundSync();
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-60"
            aria-label={`Pending sync: ${count}. Tap to retry.`}
            title="Pending offline check-ins"
        >
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudOff className="w-3 h-3" />}
            <span>Pending sync ({count})</span>
        </button>
    );
}
