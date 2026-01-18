'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Clock, User, Shield, Activity } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    details: any;
    userId: string;
    userName: string;
    userRole: string;
    createdAt: string;
}

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/audit-logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'text-green-400 bg-green-400/10';
        if (action.includes('UPDATE')) return 'text-blue-400 bg-blue-400/10';
        if (action.includes('DELETE')) return 'text-red-400 bg-red-400/10';
        if (action.includes('LOGIN')) return 'text-purple-400 bg-purple-400/10';
        return 'text-zinc-400 bg-zinc-400/10';
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.userName.toLowerCase().includes(search.toLowerCase()) ||
            log.action.toLowerCase().includes(search.toLowerCase()) ||
            log.resource.toLowerCase().includes(search.toLowerCase());

        const matchesFilter = filter === 'ALL' || log.action.includes(filter);

        return matchesSearch && matchesFilter;
    });

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

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:border-red-500 focus:outline-none"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:border-red-500 focus:outline-none"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="CREATE">Created</option>
                        <option value="UPDATE">Updated</option>
                        <option value="DELETE">Deleted</option>
                        <option value="LOGIN">Login</option>
                    </select>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Time</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">User</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Action</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Resource</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-zinc-500">Loading logs...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-zinc-500">No logs found</td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="py-3 px-4 text-sm text-zinc-400 whitespace-nowrap font-mono">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-zinc-500" />
                                                </div>
                                                <span className="text-sm text-white">{log.userName}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2 py-1 round-md text-xs font-medium rounded ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-zinc-300">
                                            {log.resource} <span className="text-zinc-600">#{log.resourceId?.slice(0, 8)}</span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-zinc-500 max-w-xs truncate">
                                            {JSON.stringify(log.details)}
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
