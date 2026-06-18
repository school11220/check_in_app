'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { TrendingUp, Filter } from 'lucide-react';

interface CohortRow {
    cohortMonth: string;
    cohortSize: number;
    retention: Record<string, number>;
}

interface FunnelStage {
    stage: string;
    count: number;
    conversion: number;
    overallConversion: number;
}

interface FunnelResponse {
    stages: FunnelStage[];
    totals: {
        initiated: number;
        paid: number;
        cancelled: number;
        refunded: number;
        abandonedRate: number;
    };
}

const HEAT_COLORS = ['#1F1F1F', '#7f1d1d', '#dc2626', '#f97316', '#facc15', '#22c55e'];

function heatColor(value: number): string {
    if (value <= 0) return HEAT_COLORS[0];
    if (value < 20) return HEAT_COLORS[1];
    if (value < 40) return HEAT_COLORS[2];
    if (value < 60) return HEAT_COLORS[3];
    if (value < 80) return HEAT_COLORS[4];
    return HEAT_COLORS[5];
}

/**
 * Side-by-side cohort retention matrix + funnel comparison across events.
 * Backed by /api/analytics/cohort and /api/analytics/funnel.
 */
export default function CohortFunnelAnalytics() {
    const { events } = useApp();
    const [cohort, setCohort] = useState<CohortRow[]>([]);
    const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
    const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams();
        selectedEventIds.forEach(id => params.append('eventId', id));
        queueMicrotask(() => setLoading(true));
        Promise.all([
            fetch('/api/analytics/cohort').then(r => r.ok ? r.json() : { rows: [] }),
            fetch(`/api/analytics/funnel${params.toString() ? `?${params.toString()}` : ''}`)
                .then(r => r.ok ? r.json() : { stages: [], totals: { initiated: 0, paid: 0, cancelled: 0, refunded: 0, abandonedRate: 0 } }),
        ])
            .then(([c, f]) => {
                setCohort(Array.isArray(c.rows) ? c.rows : []);
                setFunnel(f as FunnelResponse);
                setLoading(false);
            })
            .catch(err => console.error('Analytics load failed', err))
    }, [selectedEventIds]);

    const toggle = (id: string) => {
        setSelectedEventIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Compute up to 6 month offsets for the table
    const offsets = [0, 1, 2, 3, 5, 7, 11];

    // Per-event comparison from current funnel + cohort data
    const eventComparison = events
        .filter(e => selectedEventIds.length === 0 || selectedEventIds.includes(e.id))
        .slice(0, 8)
        .map(e => ({ id: e.id, name: e.name, sold: e.soldCount, capacity: e.capacity }));

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-400">Filter events:</span>
                <div className="flex flex-wrap gap-2">
                    {events.slice(0, 12).map(e => {
                        const active = selectedEventIds.includes(e.id);
                        return (
                            <button
                                key={e.id}
                                onClick={() => toggle(e.id)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                    active
                                        ? 'bg-red-600/20 border-red-500 text-red-300'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                            >
                                {e.name}
                            </button>
                        );
                    })}
                </div>
                {selectedEventIds.length > 0 && (
                    <button
                        onClick={() => setSelectedEventIds([])}
                        className="text-xs text-zinc-500 hover:text-white underline"
                    >
                        Clear
                    </button>
                )}
            </div>

            {loading && (
                <div className="text-zinc-500 text-sm">Loading analytics…</div>
            )}

            {/* Cohort retention matrix */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    Cohort Retention
                </h3>
                {cohort.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Not enough data yet to compute cohorts.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-zinc-400">
                                    <th className="px-3 py-2 text-left">Cohort</th>
                                    <th className="px-3 py-2 text-right">Size</th>
                                    {offsets.map(o => (
                                        <th key={o} className="px-3 py-2 text-right">M+{o}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cohort.slice(-12).map(row => (
                                    <tr key={row.cohortMonth} className="border-t border-zinc-800">
                                        <td className="px-3 py-2 text-white font-mono">{row.cohortMonth}</td>
                                        <td className="px-3 py-2 text-right text-zinc-400">{row.cohortSize}</td>
                                        {offsets.map(o => {
                                            const v = row.retention[`m${o}`] ?? 0;
                                            return (
                                                <td
                                                    key={o}
                                                    className="px-3 py-2 text-right font-mono text-white"
                                                    style={{ backgroundColor: heatColor(v) }}
                                                >
                                                    {v}%
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Funnel chart */}
            {funnel && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                        <h3 className="text-lg font-medium text-white mb-4">Booking Funnel</h3>
                        <div className="h-72">
                            <ResponsiveContainer>
                                <BarChart data={funnel.stages} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis type="number" stroke="#a1a1aa" />
                                    <YAxis type="category" dataKey="stage" stroke="#a1a1aa" width={120} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0B0B0B', border: '1px solid #27272a' }}
                                    />
                                    <Bar dataKey="count" fill="#E11D2E" radius={[0, 4, 4, 0]}>
                                        {funnel.stages.map((_, i) => (
                                            <Cell key={i} fill={['#E11D2E', '#f97316', '#facc15', '#22c55e'][i % 4]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                        <h3 className="text-lg font-medium text-white mb-4">Funnel Summary</h3>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            <Stat label="Initiated" value={funnel.totals.initiated} />
                            <Stat label="Paid" value={funnel.totals.paid} />
                            <Stat label="Cancelled" value={funnel.totals.cancelled} />
                            <Stat label="Refunded" value={funnel.totals.refunded} />
                            <Stat label="Abandonment Rate" value={`${funnel.totals.abandonedRate}%`} highlight />
                        </dl>
                        <div className="mt-5">
                            <h4 className="text-sm font-medium text-zinc-300 mb-2">Conversion by Stage</h4>
                            <ul className="space-y-2">
                                {funnel.stages.map(s => (
                                    <li key={s.stage} className="flex items-center gap-3">
                                        <span className="w-32 text-xs text-zinc-400">{s.stage}</span>
                                        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-600 to-orange-400"
                                                style={{ width: `${Math.min(100, s.overallConversion)}%` }}
                                            />
                                        </div>
                                        <span className="w-16 text-right text-sm font-mono text-white">{s.overallConversion}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Event comparison */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-lg font-medium text-white mb-4">Event Comparison</h3>
                <div className="h-64">
                    <ResponsiveContainer>
                        <BarChart data={eventComparison}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                            <YAxis stroke="#a1a1aa" />
                            <Tooltip contentStyle={{ backgroundColor: '#0B0B0B', border: '1px solid #27272a' }} />
                            <Bar dataKey="sold" fill="#E11D2E" name="Sold" />
                            <Bar dataKey="capacity" fill="#3b82f6" name="Capacity" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
    return (
        <div className={`p-3 rounded-lg border ${highlight ? 'border-red-500/40 bg-red-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
            <dt className="text-xs text-zinc-500 uppercase tracking-wider">{label}</dt>
            <dd className={`text-xl font-semibold mt-1 ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</dd>
        </div>
    );
}
