'use client';

import { useCallback, useEffect, useState } from 'react';
import {RefreshCw, Smartphone} from '@/components/icons';
import { useToast } from '@/components/Toaster';
import { Event } from '@/lib/store';

interface ScannerDevice {
  id: string;
  name: string;
  deviceId?: string;
  eventIds: string[];
  isEnabled: boolean;
  lastActive?: string | null;
}

export default function ScannerAssignmentManager({ events }: { events: Event[] }) {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/scanners');
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || 'Failed to load scanner devices');
      setDevices(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load scanner devices', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const toggleEvent = (device: ScannerDevice, eventId: string) => {
    const nextEventIds = device.eventIds.includes(eventId)
      ? device.eventIds.filter(id => id !== eventId)
      : [...device.eventIds, eventId];
    setDevices(current => current.map(item => item.id === device.id ? { ...item, eventIds: nextEventIds } : item));
  };

  const saveDevice = async (device: ScannerDevice) => {
    setSavingId(device.id);
    try {
      const res = await fetch('/api/admin/scanners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: device.id, eventIds: device.eventIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to update scanner');
      showToast('Scanner assignment updated', 'success');
      await loadDevices();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update scanner', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#E11D2E]" />
            Scanner Assignments
          </h3>
          <p className="text-sm text-[#737373]">Control which assigned events each scanner can open.</p>
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="px-3 py-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-[#B3B3B3] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="py-8 text-center text-[#737373] border border-dashed border-[#2A2A2A] rounded-xl">
          No scanner devices registered yet.
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map(device => (
            <div key={device.id} className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1F1F1F]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-white font-medium">{device.name}</p>
                  <p className="text-xs text-[#737373] font-mono">{device.deviceId || device.id}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border self-start sm:self-auto ${device.isEnabled ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                  {device.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {events.map(event => (
                  <label key={event.id} className="flex items-center gap-2 text-sm text-[#B3B3B3] bg-[#141414] border border-[#1F1F1F] rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={device.eventIds.includes(event.id)}
                      onChange={() => toggleEvent(device, event.id)}
                      className="accent-[#E11D2E]"
                    />
                    <span className="truncate">{event.name}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => saveDevice(device)}
                disabled={savingId === device.id}
                className="mt-3 px-4 py-2 bg-[#E11D2E] text-white rounded-xl text-sm font-medium hover:bg-[#B91C1C] disabled:opacity-50"
              >
                {savingId === device.id ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
