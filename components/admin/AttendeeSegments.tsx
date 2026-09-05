'use client';

import { useCallback, useEffect, useState } from 'react';
import { readJsonResponse } from '@/lib/client-response';

type EventOption = { id: string; name: string };
type Filters = { statuses: string[]; checkedIn: boolean | null; hasEmail: boolean | null; hasPhone: boolean | null; paymentMethods: string[]; createdFrom: string | null; createdTo: string | null; search: string };
type Segment = { id: string; name: string; description?: string | null; eventId?: string | null; event?: EventOption | null; filters: Filters; count: number };

const EMPTY_FILTERS: Filters = { statuses: [], checkedIn: null, hasEmail: null, hasPhone: null, paymentMethods: [], createdFrom: null, createdTo: null, search: '' };

export default function AttendeeSegments({ events }: { events: EventOption[] }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventId, setEventId] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [preview, setPreview] = useState<{ count: number; attendees: any[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/attendee-segments');
    const data = await readJsonResponse<Segment[] | { error?: string }>(response, 'Failed to load segments');
    if (!response.ok || !Array.isArray(data)) throw new Error(!Array.isArray(data) ? data.error || 'Failed to load segments' : 'Failed to load segments');
    setSegments(data);
  }, []);

  useEffect(() => { load().catch((err) => setError(err.message)); }, [load]);

  const runPreview = async (nextFilters = filters, nextEventId = eventId) => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/attendee-segments/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: nextEventId || null, filters: nextFilters }) });
      const data = await readJsonResponse<{ count: number; attendees: any[]; error?: string }>(response, 'Preview failed');
      if (!response.ok) throw new Error(data.error || 'Preview failed');
      setPreview(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Preview failed'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!name.trim()) return setError('Give the segment a name');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/attendee-segments', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), name, description, eventId: eventId || null, filters }) });
      const data = await readJsonResponse<{ error?: string }>(response, 'Failed to save segment');
      if (!response.ok) throw new Error(data.error || 'Failed to save segment');
      setName(''); setDescription(''); setEditingId(null); setPreview(null); setFilters(EMPTY_FILTERS);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save segment'); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this saved segment?')) return;
    const response = await fetch(`/api/admin/attendee-segments?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) await load(); else setError((await readJsonResponse<{ error?: string }>(response, 'Delete failed')).error || 'Delete failed');
  };

  const toggleStatus = (status: string) => setFilters((current) => ({ ...current, statuses: current.statuses.includes(status) ? current.statuses.filter((item) => item !== status) : [...current.statuses, status] }));

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold text-white">Attendee Segments</h2><p className="text-sm text-zinc-400">Build reusable, live attendee lists. Counts update automatically as tickets change.</p></div>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="grid gap-3 sm:grid-cols-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name" className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"/><select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"><option value="">All accessible events</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="min-h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"/>
        <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Name, email, phone, or ticket ID contains…" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"/>
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Ticket status</p><div className="flex flex-wrap gap-2">{['paid','pending','partially_refunded','refunded','cancelled'].map((status) => <button key={status} onClick={() => toggleStatus(status)} className={`rounded-lg border px-3 py-2 text-xs ${filters.statuses.includes(status) ? 'border-red-500 bg-red-500/15 text-red-300' : 'border-zinc-700 text-zinc-400'}`}>{status.replaceAll('_',' ')}</button>)}</div></div>
        <div className="grid gap-3 sm:grid-cols-3">{[
          ['Attendance', 'checkedIn', filters.checkedIn], ['Has email', 'hasEmail', filters.hasEmail], ['Has phone', 'hasPhone', filters.hasPhone],
        ].map(([label, key, value]) => <label key={String(key)} className="text-xs text-zinc-400">{String(label)}<select value={value === null ? 'any' : value ? 'yes' : 'no'} onChange={(e) => setFilters({ ...filters, [String(key)]: e.target.value === 'any' ? null : e.target.value === 'yes' })} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"><option value="any">Any</option><option value="yes">Yes</option><option value="no">No</option></select></label>)}</div>
        <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => runPreview()} className="rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Preview</button><button disabled={busy} onClick={save} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{editingId ? 'Update segment' : 'Save segment'}</button>{editingId && <button onClick={() => { setEditingId(null); setName(''); setDescription(''); setFilters(EMPTY_FILTERS); }} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300">Cancel edit</button>}</div>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h3 className="font-semibold text-white">Live preview</h3><p className="mb-4 text-3xl font-bold text-red-400">{preview?.count ?? '—'}</p><div className="max-h-[430px] space-y-2 overflow-y-auto">{preview?.attendees.map((attendee) => <div key={attendee.id} className="rounded-xl bg-zinc-950 p-3"><div className="flex justify-between gap-2"><span className="truncate text-sm font-medium text-white">{attendee.name}</span><span className="text-xs text-zinc-500">{attendee.status}</span></div><p className="truncate text-xs text-zinc-500">{attendee.email || attendee.phone || 'No contact'} · {attendee.event?.name}</p></div>)}</div></div>
    </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{segments.map((segment) => <div key={segment.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{segment.name}</h3><p className="text-xs text-zinc-500">{segment.event?.name || 'All accessible events'}</p></div><span className="rounded-lg bg-red-500/15 px-3 py-1 text-sm font-bold text-red-300">{segment.count}</span></div>{segment.description && <p className="mt-3 text-sm text-zinc-400">{segment.description}</p>}<div className="mt-4 flex gap-2"><button onClick={() => { setEditingId(segment.id); setName(segment.name); setDescription(segment.description || ''); setEventId(segment.eventId || ''); setFilters(segment.filters); runPreview(segment.filters, segment.eventId || ''); }} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-white">Edit</button><button onClick={() => remove(segment.id)} className="rounded-lg bg-red-950 px-3 py-2 text-xs text-red-300">Delete</button></div></div>)}</div>
  </div>;
}
