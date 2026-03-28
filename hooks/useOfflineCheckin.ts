'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface OfflineCheckIn {
  id: string;
  ticketId: string;
  token: string;
  timestamp: string;
  deviceId: string;
  synced: boolean;
}

const STORAGE_KEY = 'offline_checkins';
const DEVICE_KEY = 'device_id';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

function getStoredCheckins(): OfflineCheckIn[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function storeCheckins(checkins: OfflineCheckIn[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkins));
}

export function useOfflineCheckin() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pendingSync, setPendingSync] = useState<OfflineCheckIn[]>(() => getStoredCheckins().filter(c => !c.synced));
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [deviceId] = useState(() => getDeviceId());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const addOfflineCheckin = useCallback((ticketId: string, token: string): OfflineCheckIn => {
    const checkin: OfflineCheckIn = {
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticketId,
      token,
      timestamp: new Date().toISOString(),
      deviceId,
      synced: false,
    };

    const stored = getStoredCheckins();
    // Prevent duplicate offline checkins for same ticket
    if (stored.some(c => c.ticketId === ticketId && !c.synced)) {
      throw new Error('Ticket already queued for check-in');
    }
    stored.push(checkin);
    storeCheckins(stored);
    setPendingSync(stored.filter(c => !c.synced));

    return checkin;
  }, [deviceId]);

  const syncPending = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);

    const stored = getStoredCheckins();
    const pending = stored.filter(c => !c.synced);

    for (const checkin of pending) {
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: checkin.ticketId,
            token: checkin.token,
            deviceId: checkin.deviceId,
            offlineTimestamp: checkin.timestamp,
          }),
        });

        if (res.ok || res.status === 400) {
          // 400 = already checked in, which is fine
          checkin.synced = true;
        }
      } catch {
        // Network error, will retry later
      }
    }

    storeCheckins(stored);
    setPendingSync(stored.filter(c => !c.synced));
    setIsSyncing(false);
  }, [isSyncing]);

  useEffect(() => {
    if (isOnline) {
      if (pendingSync.length > 0) {
        window.setTimeout(() => {
          void syncPending();
        }, 0);
      }
      syncIntervalRef.current = setInterval(() => {
        const pending = getStoredCheckins().filter(c => !c.synced);
        if (pending.length > 0) {
          void syncPending();
        }
      }, 30000);
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isOnline, pendingSync.length, syncPending]);

  const clearSynced = useCallback(() => {
    const stored = getStoredCheckins().filter(c => !c.synced);
    storeCheckins(stored);
    setPendingSync(stored);
  }, []);

  return {
    isOnline,
    pendingSync,
    isSyncing,
    addOfflineCheckin,
    syncPending,
    clearSynced,
    deviceId,
  };
}
