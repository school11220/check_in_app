'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Loader2 } from '@/components/icons';

interface EventOption { id: string; name: string; }
interface Operations { event: EventOption & { capacity: number }; metrics: { capacity: number; paid: number; checkedIn: number; remaining: number; utilization: number; today: number; manualToday: number; offlineToday: number; duplicateAttempts: number; activeDevices: number }; hourly: number[]; }

export default function CheckInOperationsDashboard({ events, defaultEventId }: { events: EventOption[]; defaultEventId?: string }) {
  const [eventId, setEventId] = useState(defaultEventId || events[0]?.id || '');
  const [data, setData] = useState<Operations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true); setError('');
    try { const res = await fetch(`/api/checkin/operations?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' }); const body = await res.json(); if (!res.ok) throw new Error(body.error || 'Unable to load check-in operations'); setData(body); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load check-in operations'); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); return () => clearInterval(timer); }, [load]);
  const metrics = data?.metrics;
  return <section className="space-y-4 rounded-2xl border border-[#1F1F1F] bg-[#0D0D0D] p-5 text-white">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Activity className="text-green-400" /> Live check-in operations</h2><p className="text-xs text-[#737373]">Attendance operations only. Sales and revenue are intentionally excluded.</p></div><div className="flex gap-2"><select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border border-[#333] bg-[#141414] px-3 py-2 text-sm">{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select><button onClick={() => void load()} className="rounded-lg border border-[#333] p-2 text-[#B3B3B3]" aria-label="Refresh operations"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div>
    {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}<button onClick={() => void load()} className="ml-3 underline">Retry</button></div> : loading && !data ? <div className="flex items-center gap-2 py-8 text-sm text-[#737373]"><Loader2 className="h-4 w-4 animate-spin" />Loading operations…</div> : metrics && <><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[['Checked in', metrics.checkedIn], ['Paid guests', metrics.paid], ['Today', metrics.today], ['Manual today', metrics.manualToday], ['Active devices', metrics.activeDevices]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#1F1F1F] bg-[#141414] p-3"><p className="text-xs text-[#737373]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-[#1F1F1F] p-4"><div className="mb-3 flex justify-between text-sm"><span>Check-in progress</span><span>{metrics.utilization}%</span></div><div className="h-3 overflow-hidden rounded-full bg-[#242424]"><div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, metrics.utilization)}%` }} /></div><p className="mt-2 text-xs text-[#737373]">{metrics.remaining} paid guests remaining</p></div><div className="rounded-xl border border-[#1F1F1F] p-4"><p className="mb-3 text-sm">Today by hour</p><div className="flex h-24 items-end gap-1">{data.hourly.map((count, hour) => <div key={hour} className="flex-1 rounded-t bg-green-500/70" style={{ height: `${Math.max(3, (count / Math.max(1, ...data.hourly)) * 100)}%` }} title={`${hour}:00 — ${count}`} />)}</div></div></div></>}
  </section>;
}
