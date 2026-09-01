'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type EventOption = { id: string; name: string; date?: string; sendReminders?: boolean };
type Schedule = { id: string; eventId: string; enabled: boolean; offsetsMinutes: number[]; channels: string[]; lastProcessedAt?: string | null; event: EventOption; deliveryStats: Record<string, number> };
const OFFSET_OPTIONS = [{ value: 10080, label: '7 days' }, { value: 4320, label: '3 days' }, { value: 1440, label: '1 day' }, { value: 360, label: '6 hours' }, { value: 120, label: '2 hours' }, { value: 60, label: '1 hour' }];

export default function ReminderManager({ events, isAdmin = false }: { events: EventOption[]; isAdmin?: boolean }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [eventId, setEventId] = useState(events[0]?.id || '');
  const [enabled, setEnabled] = useState(false);
  const [offsets, setOffsets] = useState<number[]>([10080, 1440, 120]);
  const [channels, setChannels] = useState<string[]>(['email']);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => { const response = await fetch('/api/admin/reminders'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Failed to load reminders'); setSchedules(data); }, []);
  useEffect(() => { load().catch((err) => setError(err.message)); }, [load]);
  useEffect(() => { if (!eventId && events[0]) setEventId(events[0].id); }, [eventId, events]);
  const current = useMemo(() => schedules.find((item) => item.eventId === eventId), [schedules, eventId]);
  useEffect(() => { if (current) { setEnabled(current.enabled); setOffsets(current.offsetsMinutes); setChannels(current.channels); } else { setEnabled(false); setOffsets([10080,1440,120]); setChannels(['email']); } }, [current]);

  const save = async () => {
    if (!eventId || !offsets.length || !channels.length) return setError('Select an event, at least one time, and one channel');
    setBusy(true); setError(''); setMessage('');
    try { const response = await fetch('/api/admin/reminders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, enabled, offsetsMinutes: offsets, channels }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Save failed'); setMessage(enabled ? 'Reminder schedule enabled.' : 'Reminder schedule saved but disabled.'); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); } finally { setBusy(false); }
  };
  const runNow = async () => { setBusy(true); setError(''); setMessage(''); try { const response = await fetch('/api/admin/reminders', { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Processing failed'); setMessage(`Processed ${data.attempted} deliveries: ${data.sent} sent, ${data.failed} failed.`); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Processing failed'); } finally { setBusy(false); } };
  const retryFailures = async () => { if (!eventId) return; setBusy(true); setError(''); setMessage(''); try { const response = await fetch('/api/admin/reminders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Retry reset failed'); setMessage(`${data.reset} failed reminder${data.reset === 1 ? '' : 's'} queued for retry.`); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Retry reset failed'); } finally { setBusy(false); } };
  const toggle = (list: any[], value: any, setter: (value: any[]) => void) => setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return <div className="space-y-6"><div><h2 className="text-2xl font-bold text-white">Reliable Event Reminders</h2><p className="text-sm text-zinc-400">Scheduled, idempotent email/SMS reminders with retries and delivery status.</p></div>{error && <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}{message && <div className="rounded-xl border border-green-900 bg-green-950/40 px-4 py-3 text-sm text-green-300">{message}</div>}
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-zinc-400">Event<select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white">{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label><label className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-red-600"/>Enable automatic reminders</label></div>
      <div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Send before event</p><div className="flex flex-wrap gap-2">{OFFSET_OPTIONS.map((option) => <button key={option.value} onClick={() => toggle(offsets, option.value, setOffsets)} className={`rounded-lg border px-3 py-2 text-xs ${offsets.includes(option.value) ? 'border-red-500 bg-red-500/15 text-red-300' : 'border-zinc-700 text-zinc-400'}`}>{option.label}</button>)}</div></div>
      <div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Channels</p><div className="flex gap-2">{['email','sms'].map((channel) => <button key={channel} onClick={() => toggle(channels, channel, setChannels)} className={`rounded-lg border px-4 py-2 text-sm capitalize ${channels.includes(channel) ? 'border-red-500 bg-red-500/15 text-red-300' : 'border-zinc-700 text-zinc-400'}`}>{channel}</button>)}</div></div>
      <div className="mt-6 flex flex-wrap gap-3"><button disabled={busy || !events.length} onClick={save} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save schedule</button><button disabled={busy || !current?.deliveryStats?.failed} onClick={retryFailures} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 disabled:opacity-40">Retry failures</button>{isAdmin && <button disabled={busy} onClick={runNow} className="rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Process due now</button>}</div></div>
    <div className="grid gap-3 md:grid-cols-2">{schedules.map((schedule) => <div key={schedule.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex justify-between gap-4"><div><h3 className="font-semibold text-white">{schedule.event.name}</h3><p className="text-xs text-zinc-500">{schedule.offsetsMinutes.map((value) => OFFSET_OPTIONS.find((item) => item.value === value)?.label || `${value} min`).join(', ')} · {schedule.channels.join(' + ')}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs ${schedule.enabled ? 'bg-green-500/15 text-green-300' : 'bg-zinc-800 text-zinc-400'}`}>{schedule.enabled ? 'Active' : 'Paused'}</span></div><div className="mt-4 flex gap-4 text-xs text-zinc-400"><span>Sent: {schedule.deliveryStats.sent || 0}</span><span>Failed: {schedule.deliveryStats.failed || 0}</span><span>Pending: {schedule.deliveryStats.pending || 0}</span></div></div>)}</div>
  </div>;
}
