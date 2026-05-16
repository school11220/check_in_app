'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Receipt, RefreshCw, Ticket, TrendingUp, Users, type LucideIcon } from 'lucide-react';

interface DashboardInsightsProps {
  eventId?: string | null;
  compact?: boolean;
}

interface DashboardData {
  revenue?: {
    total?: number;
    today?: number;
    thisWeek?: number;
    thisMonth?: number;
    discounted?: number;
    refunded?: number;
    byEvent?: { eventId: string; name: string; revenue: number; tickets: number }[];
    byDay?: { date: string; revenue: number }[];
    byPaymentMethod?: { method: string; revenue: number }[];
    byPromoCode?: { code: string; revenue: number }[];
  };
  tickets?: {
    total?: number;
    checkedIn?: number;
    refunded?: number;
    abandoned?: number;
    failedPaymentSignals?: number;
    checkInRate?: string;
  };
  topEvents?: { id: string; name: string; soldCount: number; capacity: number; revenue: number; occupancy: string }[];
  checkinVelocity?: { hour: string; count: number }[];
  refunds?: {
    total?: number;
    full?: number;
    partial?: number;
    byDay?: { date: string; amount: number }[];
  };
}

const formatMoney = (amount = 0) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount / 100);

function StatCard({ icon: Icon, label, value, hint }: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#E11D2E]/15 text-[#FF6B7A] flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[#737373] text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {hint && <p className="text-xs text-[#737373] mt-1">{hint}</p>}
    </div>
  );
}

function SmallChart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardInsights({ eventId, compact = false }: DashboardInsightsProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
      const res = await fetch(`/api/admin/dashboard${query}`);
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Failed to load dashboard');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const revenueByDay = data?.revenue?.byDay || [];
  const checkinVelocity = useMemo(
    () => (data?.checkinVelocity || []).filter(point => point.count > 0),
    [data?.checkinVelocity]
  );
  const refundsByDay = data?.refunds?.byDay || [];
  const paymentMethods = data?.revenue?.byPaymentMethod || [];
  const promoCodes = (data?.revenue?.byPromoCode || []).filter(item => item.code !== 'none');

  if (loading && !data) {
    return (
      <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-8 text-center text-[#737373]">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#E11D2E]" />
        Loading dashboard...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6 text-center text-yellow-400">
        <AlertTriangle className="w-6 h-6 mx-auto mb-3" />
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{compact ? 'Event Analytics' : 'Revenue and Operations'}</h2>
          <p className="text-sm text-[#737373]">Paid, partially refunded, refunds, check-ins, and failed payment signals are tracked consistently.</p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#1F1F1F] text-[#B3B3B3] hover:text-white disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Net Revenue" value={formatMoney(data.revenue?.total)} hint={`Today ${formatMoney(data.revenue?.today)}`} />
        <StatCard icon={Ticket} label="Paid Tickets" value={data.tickets?.total || 0} hint={`${data.tickets?.checkInRate || '0'}% checked in`} />
        <StatCard icon={Receipt} label="Refunded" value={formatMoney(data.refunds?.total)} hint={`${data.refunds?.partial || 0} partial, ${data.refunds?.full || 0} full`} />
        <StatCard icon={AlertTriangle} label="Risk Signals" value={(data.tickets?.failedPaymentSignals || 0) + (data.tickets?.abandoned || 0)} hint={`${data.tickets?.abandoned || 0} abandoned registrations`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {revenueByDay.length > 0 && (
          <SmallChart title="Revenue by Day">
            <AreaChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#737373" fontSize={11} />
              <YAxis stroke="#737373" fontSize={11} tickFormatter={(value) => `₹${Math.round(Number(value) / 100)}`} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a' }} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e33" />
            </AreaChart>
          </SmallChart>
        )}

        {paymentMethods.length > 0 && (
          <SmallChart title="Revenue by Payment Method">
            <BarChart data={paymentMethods}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="method" stroke="#737373" fontSize={11} />
              <YAxis stroke="#737373" fontSize={11} tickFormatter={(value) => `₹${Math.round(Number(value) / 100)}`} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a' }} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </SmallChart>
        )}

        {refundsByDay.length > 0 && (
          <SmallChart title="Refunds and Partial Refunds">
            <BarChart data={refundsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#737373" fontSize={11} />
              <YAxis stroke="#737373" fontSize={11} tickFormatter={(value) => `₹${Math.round(Number(value) / 100)}`} />
              <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a' }} />
              <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </SmallChart>
        )}

        {checkinVelocity.length > 0 && (
          <SmallChart title="Check-in Rate by Hour">
            <BarChart data={checkinVelocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="hour" stroke="#737373" fontSize={11} />
              <YAxis stroke="#737373" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a' }} />
              <Bar dataKey="count" fill="#E11D2E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </SmallChart>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-4">Top-Selling Events</h3>
          <div className="space-y-3">
            {(data.topEvents || []).slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center justify-between gap-4 border-b border-[#1F1F1F] last:border-b-0 pb-3 last:pb-0">
                <div className="min-w-0">
                  <p className="text-white truncate">{event.name}</p>
                  <p className="text-xs text-[#737373]">{event.soldCount}/{event.capacity} sold, {event.occupancy}% occupancy</p>
                </div>
                <span className="text-green-400 text-sm font-medium">{formatMoney(event.revenue)}</span>
              </div>
            ))}
            {(data.topEvents || []).length === 0 && <p className="text-sm text-[#737373]">No paid attendees yet.</p>}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-4">Promo Codes and Conversion</h3>
          <div className="space-y-3">
            {promoCodes.slice(0, 5).map(item => (
              <div key={item.code} className="flex items-center justify-between border-b border-[#1F1F1F] last:border-b-0 pb-3 last:pb-0">
                <span className="text-[#B3B3B3] font-mono text-sm">{item.code}</span>
                <span className="text-white text-sm">{formatMoney(item.revenue)}</span>
              </div>
            ))}
            {promoCodes.length === 0 && <p className="text-sm text-[#737373]">No promo code revenue in this scope.</p>}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-[#0D0D0D] border border-[#1F1F1F] p-3">
                <p className="text-xs text-[#737373]">Discounts</p>
                <p className="text-white font-semibold">{formatMoney(data.revenue?.discounted)}</p>
              </div>
              <div className="rounded-xl bg-[#0D0D0D] border border-[#1F1F1F] p-3">
                <p className="text-xs text-[#737373]">Checked In</p>
                <p className="text-white font-semibold flex items-center gap-1"><Users className="w-4 h-4 text-[#E11D2E]" /> {data.tickets?.checkedIn || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
