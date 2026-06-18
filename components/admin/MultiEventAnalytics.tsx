'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import {Users, CheckSquare, DollarSign, Star, TrendingUp, ChevronDown} from '@/components/icons';
const PALETTE = ['#e11d2e', '#3b82f6', '#a855f7', '#f59e0b', '#22c55e', '#ec4899', '#0ea5e9', '#f97316'];
const PAID_LIKE_STATUSES = new Set(['paid', 'partially_refunded']);

type Metric = 'tickets' | 'checkins' | 'revenue' | 'checkinRate' | 'avgRating';

const METRIC_LABELS: Record<Metric, string> = {
    tickets: 'Tickets Sold',
    checkins: 'Check-ins',
    revenue: 'Revenue (₹)',
    checkinRate: 'Check-in Rate (%)',
    avgRating: 'Avg Rating',
};

export default function MultiEventAnalytics() {
    const { events, tickets, reviews } = useApp();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [metric, setMetric] = useState<Metric>('tickets');

    const toggleEvent = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : prev.length < 8 ? [...prev, id] : prev
        );
    };

    const selectAll = () => {
        setSelectedIds(events.slice(0, 8).map(e => e.id));
    };

    const clearAll = () => setSelectedIds([]);

    // Derived per-event stats
    const eventStats = useMemo(() => {
        return events.map(event => {
            const eventTickets = tickets.filter(t => t.eventId === event.id && PAID_LIKE_STATUSES.has(t.status));
            const checkedIn = eventTickets.filter(t => t.checkedIn).length;
            const revenue = eventTickets.reduce((sum, t) => sum + (t.amountPaid ?? event.price ?? 0), 0);
            const checkinRate = eventTickets.length ? Math.round((checkedIn / eventTickets.length) * 100) : 0;
            const eventReviews = reviews.filter((r: any) => r.eventId === event.id && r.rating);
            const avgRating = eventReviews.length
                ? Math.round((eventReviews.reduce((s: number, r: any) => s + r.rating, 0) / eventReviews.length) * 10) / 10
                : 0;
            return { id: event.id, name: event.name, tickets: eventTickets.length, checkins: checkedIn, revenue, checkinRate, avgRating, date: event.date };
        });
    }, [events, tickets, reviews]);

    const selectedStats = useMemo(() => {
        if (selectedIds.length === 0) return eventStats;
        return eventStats.filter(s => selectedIds.includes(s.id));
    }, [eventStats, selectedIds]);

    // Bar chart data
    const barData = useMemo(() =>
        selectedStats.map((s, i) => ({
            name: s.name.length > 16 ? s.name.slice(0, 16) + '…' : s.name,
            value: s[metric] as number,
            fill: PALETTE[i % PALETTE.length],
        })),
        [selectedStats, metric]
    );

    // Summary cards (totals across selection)
    const totals = useMemo(() => ({
        tickets: selectedStats.reduce((s, e) => s + e.tickets, 0),
        checkins: selectedStats.reduce((s, e) => s + e.checkins, 0),
        revenue: selectedStats.reduce((s, e) => s + e.revenue, 0),
        avgCheckInRate: selectedStats.length
            ? Math.round(selectedStats.reduce((s, e) => s + e.checkinRate, 0) / selectedStats.length)
            : 0,
        avgRating: selectedStats.filter(e => e.avgRating > 0).length
            ? (selectedStats.filter(e => e.avgRating > 0).reduce((s, e) => s + e.avgRating, 0) / selectedStats.filter(e => e.avgRating > 0).length).toFixed(1)
            : '—',
    }), [selectedStats]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Multi-Event Analytics</h2>
                    <p className="text-zinc-400 text-sm mt-0.5">Compare events side by side</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition">
                        Select Top 8
                    </button>
                    <button onClick={clearAll} className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition">
                        Clear
                    </button>
                </div>
            </div>

            {/* Event selector */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Select events to compare</p>
                <div className="flex flex-wrap gap-2">
                    {events.map((e, i) => {
                        const selected = selectedIds.includes(e.id);
                        const color = PALETTE[selectedIds.indexOf(e.id) % PALETTE.length];
                        return (
                            <button
                                key={e.id}
                                onClick={() => toggleEvent(e.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                                    selected
                                        ? 'text-white border-transparent'
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                                }`}
                                style={selected ? { background: `${color}22`, borderColor: `${color}66`, color } : undefined}
                            >
                                {selected && <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: color }} />}
                                {e.name.length > 24 ? e.name.slice(0, 24) + '…' : e.name}
                            </button>
                        );
                    })}
                </div>
                {selectedIds.length === 0 && (
                    <p className="text-xs text-zinc-500 mt-2 italic">No events selected — showing all {events.length} events in chart</p>
                )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Total Tickets', value: totals.tickets.toLocaleString(), icon: Users, color: 'text-blue-400' },
                    { label: 'Total Check-ins', value: totals.checkins.toLocaleString(), icon: CheckSquare, color: 'text-green-400' },
                    { label: 'Total Revenue', value: `₹${totals.revenue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-red-400' },
                    { label: 'Avg Check-in %', value: `${totals.avgCheckInRate}%`, icon: TrendingUp, color: 'text-amber-400' },
                    { label: 'Avg Rating', value: String(totals.avgRating), icon: Star, color: 'text-yellow-400' },
                ].map(card => (
                    <div key={card.label} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                        <card.icon className={`w-4 h-4 mb-2 ${card.color}`} />
                        <p className="text-2xl font-bold text-white leading-none mb-1">{card.value}</p>
                        <p className="text-xs text-zinc-500">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Metric selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 shrink-0">Compare by:</span>
                <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(METRIC_LABELS) as Metric[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setMetric(m)}
                            className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                                metric === m
                                    ? 'bg-red-600 border-red-500 text-white'
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                            }`}
                        >
                            {METRIC_LABELS[m]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bar chart */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">{METRIC_LABELS[metric]} by Event</h3>
                {barData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">No data</div>
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ left: 0, right: 0, top: 4, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, color: '#fff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} name={METRIC_LABELS[metric]}>
                                {barData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Comparison table */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left py-3 px-4 text-xs text-zinc-400 font-medium uppercase tracking-wider">Event</th>
                                <th className="text-right py-3 px-4 text-xs text-zinc-400 font-medium uppercase tracking-wider">Tickets</th>
                                <th className="text-right py-3 px-4 text-xs text-zinc-400 font-medium uppercase tracking-wider">Check-ins</th>
                                <th className="text-right py-3 px-4 text-xs text-zinc-400 font-medium uppercase tracking-wider">Rate</th>
                                <th className="text-right py-3 px-4 text-xs text-zinc-400 font-medium uppercase tracking-wider">Revenue</th>
                                <th className="text-right py-3 px-4 text-xs text-zinc-400 font-medium uppercase tracking-wider">Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedStats.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-zinc-500">No events selected</td></tr>
                            ) : (
                                selectedStats.map((s, i) => (
                                    <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                                                <span className="text-white font-medium line-clamp-1">{s.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-zinc-300">{s.tickets}</td>
                                        <td className="py-3 px-4 text-right text-zinc-300">{s.checkins}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`font-medium ${s.checkinRate >= 70 ? 'text-green-400' : s.checkinRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {s.checkinRate}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-zinc-300">₹{s.revenue.toLocaleString('en-IN')}</td>
                                        <td className="py-3 px-4 text-right text-zinc-300">
                                            {s.avgRating > 0 ? <span className="flex items-center justify-end gap-1"><Star className="w-3 h-3 text-yellow-400" />{s.avgRating}</span> : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
