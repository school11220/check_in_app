'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { classifyOfflineSyncResponse } from '@/lib/offline-checkin';

export interface OfflineCheckIn {
  id: string; ticketId: string; eventId: string; token: string; timestamp: string; deviceId: string; synced: boolean;
  attempts?: number; lastAttemptAt?: string; lastError?: string;
}
interface OfflineCheckInDB extends DBSchema {
  checkins: { key: string; value: OfflineCheckIn; indexes: { synced: 'synced'; eventId: 'eventId' } };
}

const DB_NAME = 'eventhub-offline-checkins';
const STORE_NAME = 'checkins';
const LEGACY_STORAGE_KEY = 'offline_checkins';
const DEVICE_KEY = 'device_id';
let dbPromise: Promise<IDBPDatabase<OfflineCheckInDB>> | null = null;

function getDb() {
  if (!dbPromise) dbPromise = openDB<OfflineCheckInDB>(DB_NAME, 1, { upgrade(db) {
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    store.createIndex('synced', 'synced'); store.createIndex('eventId', 'eventId');
  } });
  return dbPromise;
}
async function listPending() { return (await (await getDb()).getAll(STORE_NAME)).filter((item) => !item.synced); }
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) { deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem(DEVICE_KEY, deviceId); }
  return deviceId;
}

export function useOfflineCheckin() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pendingSync, setPendingSync] = useState<OfflineCheckIn[]>([]);
  const [queueReady, setQueueReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deviceId] = useState(() => getDeviceId());
  const refreshPending = useCallback(async () => { try { setPendingSync(await listPending()); setQueueReady(true); } catch (error) { console.error('Offline queue unavailable', error); } }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const db = await getDb();
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const records = JSON.parse(legacy) as OfflineCheckIn[];
          const tx = db.transaction(STORE_NAME, 'readwrite');
          for (const record of records.filter((item) => !item.synced)) await tx.store.put(record);
          await tx.done; localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        if (!cancelled) await refreshPending();
      } catch (error) { console.error('Failed to initialize offline queue', error); }
    })();
    return () => { cancelled = true; };
  }, [refreshPending]);

  useEffect(() => {
    const online = () => setIsOnline(true); const offline = () => setIsOnline(false);
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  const addOfflineCheckin = useCallback(async (ticketId: string, token: string, eventId: string) => {
    const db = await getDb();
    if ((await db.getAll(STORE_NAME)).some((item) => item.ticketId === ticketId && !item.synced)) throw new Error('Ticket already queued for check-in');
    const checkin: OfflineCheckIn = { id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ticketId, eventId, token, timestamp: new Date().toISOString(), deviceId, synced: false };
    await db.put(STORE_NAME, checkin); await refreshPending(); return checkin;
  }, [deviceId, refreshPending]);

  const syncPending = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine || !queueReady) return;
    syncingRef.current = true; setIsSyncing(true);
    try {
      const db = await getDb();
      for (const checkin of await listPending()) {
        try {
          const res = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: checkin.ticketId, eventId: checkin.eventId, token: checkin.token, deviceId: checkin.deviceId, offlineTimestamp: checkin.timestamp }) });
          const data = await res.json().catch(() => ({})); checkin.attempts = (checkin.attempts || 0) + 1; checkin.lastAttemptAt = new Date().toISOString();
          if (classifyOfflineSyncResponse(res.status, data) === 'synced') { checkin.synced = true; checkin.lastError = undefined; }
          else checkin.lastError = String(data?.message || data?.error || `Sync failed (${res.status})`);
        } catch (error) { checkin.attempts = (checkin.attempts || 0) + 1; checkin.lastAttemptAt = new Date().toISOString(); checkin.lastError = error instanceof Error ? error.message : 'Network error'; }
        await db.put(STORE_NAME, checkin);
      }
      await refreshPending();
    } finally { syncingRef.current = false; setIsSyncing(false); }
  }, [queueReady, refreshPending]);

  useEffect(() => { if (!isOnline || !queueReady) return; if (pendingSync.length) void syncPending(); syncIntervalRef.current = setInterval(() => { void syncPending(); }, 30000); return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); }; }, [isOnline, queueReady, pendingSync.length, syncPending]);
  const clearSynced = useCallback(async () => { const db = await getDb(); const tx = db.transaction(STORE_NAME, 'readwrite'); for (const item of (await db.getAll(STORE_NAME)).filter((record) => record.synced)) await tx.store.delete(item.id); await tx.done; await refreshPending(); }, [refreshPending]);
  return { isOnline, pendingSync, queueReady, isSyncing, addOfflineCheckin, syncPending, clearSynced, deviceId };
}
