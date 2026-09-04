'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Loader2, RefreshCw, Shield } from '@/components/icons';
import { useToast } from '@/components/Toaster';

export default function CheckInPolicyManager({ eventId, isAdmin = false }: { eventId: string; isAdmin?: boolean }) {
  const { showToast } = useToast();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/checkin/policy?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load check-in policy');
      setPolicy(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load policy'); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  const update = async (changes: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/checkin/policy', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, ...changes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update policy');
      showToast('Manual check-in policy updated', 'success');
      await load();
    } catch (e) { showToast(e instanceof Error ? e.message : 'Failed to update policy', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="rounded-2xl border border-[#1F1F1F] bg-[#141414] p-5 text-sm text-[#737373]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading check-in policy…</div>;
  if (error) return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}<button onClick={load} className="ml-3 inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" />Retry</button></div>;

  return <section className="rounded-2xl border border-[#1F1F1F] bg-[#141414] p-5">
    <div className="mb-4 flex items-start gap-3"><Shield className="h-5 w-5 text-[#E11D2E]" /><div><h3 className="font-semibold text-white">Manual check-in permissions</h3><p className="text-sm text-[#737373]">Manual overrides always require a reason and are recorded in the audit trail.</p></div></div>
    <div className="space-y-3">
      {isAdmin && <label className="flex items-center justify-between gap-4 rounded-xl border border-[#242424] bg-[#0D0D0D] p-3 text-sm"><span><strong className="block text-white">Enable manual check-in globally</strong><span className="text-[#737373]">Organizers must still approve each event.</span></span><input type="checkbox" checked={Boolean(policy.manualCheckInEnabled)} disabled={saving} onChange={(e) => update({ manualCheckInEnabled: e.target.checked })} className="h-5 w-5 accent-[#E11D2E]" /></label>}
      <label className="flex items-center justify-between gap-4 rounded-xl border border-[#242424] bg-[#0D0D0D] p-3 text-sm"><span><strong className="block text-white">Organizer approval for this event</strong><span className="text-[#737373]">Scanners can search and override only after approval.</span></span><input type="checkbox" checked={Boolean(policy.organizerApproved)} disabled={saving || (isAdmin && !policy.manualCheckInEnabled)} onChange={(e) => update({ organizerApproved: e.target.checked })} className="h-5 w-5 accent-[#E11D2E]" /></label>
      <p className="flex items-center gap-2 text-xs text-[#A3A3A3]"><CheckCircle className="h-4 w-4 text-green-400" />Override reasons are mandatory and retained with device and operator details.</p>
    </div>
  </section>;
}
