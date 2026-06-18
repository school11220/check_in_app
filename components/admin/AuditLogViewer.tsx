'use client';

import { useEffect, useState, useCallback } from 'react';
import {Search, Filter, Clock, User, Shield, Activity, Download, RefreshCw, X, Loader2} from '@/components/icons';

interface AuditLog {
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    details: any;
    userId: string;
    userName: string;
    userRole: string;
    ipAddress: string | null;
    createdAt: string;
}

const RESOURCES = ['ALL', 'EVENT', 'TICKET', 'USER', 'SETTINGS', 'INTEGRATION', 'AUTH', 'EMAIL_TEMPLATE', 'MESSAGE'] as const;
const ACTIONS = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CHECKIN', 'EXPORT', 'SETTINGS_UPDATE', 'EMAIL_TEMPLATE_UPDATE'] as const;

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [action, setAction] = useState<string>('ALL');
    const [resource, setResource] = useState<string>('ALL');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [exporting, setExporting] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (action && action !== 'ALL') params.set('action', action);
            if (resource && resource !== 'ALL') params.set('resource', resource);
            if (search) params.set('q', search);
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            params.set('limit', '500');
            const res = await fetch(`/api/admin/audit-logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    }, [action, resource, search, from, to]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getActionColor = (a: string) => {
        if (a.includes('CREATE')) return 'text-green-400 bg-green-400/10';
        if (a.includes('UPDATE')) return 'text-blue-400 bg-blue-400/10';
        if (a.includes('DELETE')) return 'text-red-400 bg-red-400/10';
        if (a.includes('LOGIN')) return 'text-purple-400 bg-purple-400/10';
        if (a.includes('CHECKIN')) return 'text-yellow-400 bg-yellow-400/10';
        return 'text-zinc-400 bg-zinc-400/10';
    };

    const clearFilters = () => {
        setAction('ALL');
        setResource('ALL');
        setSearch('');
        setFrom('');
        setTo('');
    };

    const exportCsv = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (action !== 'ALL') params.set('action', action);
            if (resource !== 'ALL') params.set('resource', resource);
            if (search) params.set('q', search);
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            params.set('format', 'csv');
            params.set('limit', '5000');
            const res = await fetch(`/api/admin/audit-logs?${params}`);
            if (!res.ok) throw new Error('export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // ignore
        } finally {
            setExporting(false);
        }
    };

    const hasFilters = action !== 'ALL' || resource !== 'ALL' || search || from || to;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-500" />
                        Security Audit Logs
                    </h2>
                    <p className="text-zinc-400 text-sm">Track all administrative actions and security events</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={exportCsv}
                        disabled={exporting || logs.length === 0}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export CSV
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="p-2 text-zinc-400 hover:text-white rounded-xl"
                        aria-label="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search user, action, resource…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:border-red-500 focus:outline-none"
                    />
                </div>
                <select value={action} onChange={(e) => setAction(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                    {ACTIONS.map((a) => <option key={a} value={a}>{a === 'ALL' ? 'All actions' : a}</option>)}
                </select>
                <select value={resource} onChange={(e) => setResource(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                    {RESOURCES.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'All resources' : r}</option>)}
                </select>
                <div className="flex gap-1">
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-white text-xs focus:outline-none flex-1" aria-label="From" />
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-white text-xs focus:outline-none flex-1" aria-label="To" />
                </div>
            </div>
            {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear filters
                </button>
            )}

            {loading ? (
                <div className="text-center py-10 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : logs.length === 0 ? (
                <div className="text-center py-10 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                    No audit logs match the current filters.
                </div>
            ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {logs.map((log) => (
                        <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>{log.action}</span>
                                <span className="text-zinc-300 text-sm font-medium">{log.resource}</span>
                                {log.resourceId && <span className="text-zinc-500 text-xs font-mono">#{log.resourceId.slice(0, 12)}</span>}
                                <span className="ml-auto text-zinc-500 text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {log.userName} <span className="text-zinc-600">({log.userRole})</span>
                                </span>
                                {log.ipAddress && <span className="text-zinc-600">IP: {log.ipAddress}</span>}
                            </div>
                            {log.details && (
                                <pre className="mt-2 text-[11px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="text-xs text-zinc-500 text-right">
                Showing {logs.length} entries (max 500)
            </div>
        </div>
    );
}
