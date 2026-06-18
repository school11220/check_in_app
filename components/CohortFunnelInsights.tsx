'use client';

import { useEffect, useState } from 'react';

interface FunnelResponse {
    stages: { stage: string; count: number; overallConversion: number }[];
    totals: { initiated: number; paid: number; abandonedRate: number };
}

interface CohortResponse {
    rows: { cohortMonth: string; cohortSize: number; retention: Record<string, number> }[];
}

/**
 * Compact cohort retention matrix + funnel view designed to slot into
 * DashboardInsights. Pure presentational, no store dependency.
 */
export default function CohortFunnelInsights() {
    const [cohort, setCohort] = useState<CohortResponse | null>(null);
    const [funnel, setFunnel] = useState<FunnelResponse | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/analytics/cohort').then(r => r.ok ? r.json() : { rows: [] }),
            fetch('/api/analytics/funnel').then(r => r.ok ? r.json() : null),
        ])
            .then(([c, f]) => {
                setCohort(c);
                setFunnel(f);
            })
            .catch(err => console.error('Insights load failed', err));
    }, []);

    if (!cohort && !funnel) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4">
                <h3 className="text-white font-semibold mb-3">Cohort Retention (last 6 months)</h3>
                {!cohort || cohort.rows.length === 0 ? (
                    <p className="text-sm text-[#737373]">Not enough data yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="text-[#737373]">
                                    <th className="px-2 py-1 text-left">Cohort</th>
                                    <th className="px-2 py-1 text-right">Size</th>
                                    {[0, 1, 2, 3].map(o => (
                                        <th key={o} className="px-2 py-1 text-right">M+{o}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cohort.rows.slice(-6).map(row => (
                                    <tr key={row.cohortMonth} className="border-t border-[#1F1F1F]">
                                        <td className="px-2 py-1 text-white font-mono">{row.cohortMonth}</td>
                                        <td className="px-2 py-1 text-right text-[#B3B3B3]">{row.cohortSize}</td>
                                        {[0, 1, 2, 3].map(o => {
                                            const v = row.retention[`m${o}`] ?? 0;
                                            const bg = v > 70 ? 'bg-green-500/30'
                                                : v > 40 ? 'bg-yellow-500/30'
                                                : v > 0 ? 'bg-red-500/30' : '';
                                            return (
                                                <td key={o} className={`px-2 py-1 text-right text-white font-mono ${bg}`}>
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

            <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-4">
                <h3 className="text-white font-semibold mb-3">Funnel Snapshot</h3>
                {!funnel ? (
                    <p className="text-sm text-[#737373]">No funnel data.</p>
                ) : (
                    <div className="space-y-2">
                        {funnel.stages.map(s => (
                            <div key={s.stage}>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[#B3B3B3]">{s.stage}</span>
                                    <span className="text-white font-mono">{s.count} · {s.overallConversion}%</span>
                                </div>
                                <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#E11D2E] to-orange-400"
                                        style={{ width: `${Math.min(100, s.overallConversion)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {funnel.totals.abandonedRate > 0 && (
                            <p className="text-xs text-[#737373] pt-2">
                                Abandonment rate: <span className="text-red-400">{funnel.totals.abandonedRate}%</span>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
