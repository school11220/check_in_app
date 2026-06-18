'use client';

import { useOfflineSync } from '@/hooks/useOfflineSync';
import {WifiOff, Wifi, RotateCcw, Loader2} from '@/components/icons';
interface OfflineBannerProps {
    className?: string;
}

export default function OfflineBanner({ className = '' }: OfflineBannerProps) {
    const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

    // When online and no pending — show nothing
    if (isOnline && pendingCount === 0) return null;

    return (
        <div
            className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl border text-sm font-medium transition-all ${
                isOnline
                    ? 'bg-green-900/80 border-green-600/40 text-green-300 backdrop-blur'
                    : 'bg-amber-900/80 border-amber-600/40 text-amber-300 backdrop-blur'
            } ${className}`}
        >
            {isOnline
                ? <Wifi className="w-4 h-4 shrink-0 text-green-400" />
                : <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
            }

            <span>
                {!isOnline && pendingCount === 0 && 'You\'re offline — check-ins will be queued'}
                {!isOnline && pendingCount > 0 && `Offline — ${pendingCount} check-in${pendingCount > 1 ? 's' : ''} queued`}
                {isOnline && pendingCount > 0 && `Back online — ${pendingCount} pending check-in${pendingCount > 1 ? 's' : ''}`}
            </span>

            {isOnline && pendingCount > 0 && (
                <button
                    onClick={syncNow}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 bg-green-600/30 hover:bg-green-600/50 border border-green-500/40 rounded-xl px-3 py-1 text-xs text-green-200 transition disabled:opacity-50"
                >
                    {isSyncing
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Syncing…</>
                        : <><RotateCcw className="w-3 h-3" /> Sync now</>
                    }
                </button>
            )}
        </div>
    );
}
