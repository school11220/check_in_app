'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/store';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

// Chart colors
const COLORS = ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#0d9488', '#0891b2', '#0284c7', '#7c3aed'];

interface AttendeeInsightsProps {
    eventId?: string; // Optional filter by event
}

export default function AttendeeInsights({ eventId }: AttendeeInsightsProps) {
    const { tickets, events } = useApp();
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

    const [analytics, setAnalytics] = useState<any>({
        totalTickets: 0,
        checkedInTickets: 0,
        checkInRate: '0',
        repeatAttendees: 0,
        uniqueAttendees: 0,
        salesByEventData: [],
        salesTrendData: [],
        peakHoursData: [],
        checkInData: []
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const query = new URLSearchParams({ timeRange });
                if (eventId) query.append('eventId', eventId);

                const res = await fetch(`/api/analytics?${query.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setAnalytics(data);
                }
            } catch (error) {
                console.error('Failed to load analytics', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [eventId, timeRange]);

    // Export to CSV
    const exportToCSV = () => {
        window.location.href = `/api/export?eventId=${eventId}`;
        // toast.success("Export started");
    };

    return (
        <div className="space-y-6">
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Attendee Insights</h2>
                    <p className="text-sm text-zinc-400">Analytics and trends for your events</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as any)}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="all">All time</option>
                    </select>

                    {/* Export Button */}
                    <button
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white text-sm flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-sm text-zinc-400">Total Tickets</p>
                    <p className="text-3xl font-bold text-white mt-1">{analytics.totalTickets}</p>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-sm text-zinc-400">Unique Attendees</p>
                    <p className="text-3xl font-bold text-white mt-1">{analytics.uniqueAttendees}</p>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-sm text-zinc-400">Repeat Attendees</p>
                    <p className="text-3xl font-bold text-green-400 mt-1">{analytics.repeatAttendees}</p>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-sm text-zinc-400">Check-in Rate</p>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{analytics.checkInRate}%</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Sales Trend</h3>
                    <div className="h-64 min-h-[256px]">
                        {analytics.salesTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.salesTrendData}>
                                    <defs>
                                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#dc2626" fill="url(#salesGradient)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-500">No sales data</div>
                        )}
                    </div>
                </div>

                {/* Sales by Event */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Sales by Event</h3>
                    <div className="h-64 min-h-[256px]">
                        {analytics.salesByEventData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.salesByEventData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                    <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11} width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-500">No event data</div>
                        )}
                    </div>
                </div>

                {/* Peak Booking Hours */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Peak Booking Hours</h3>
                    <div className="h-64 min-h-[256px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.peakHoursData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={10} interval={2} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                />
                                <Bar dataKey="bookings" fill="#0891b2" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Check-in Status */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Check-in Status</h3>
                    <div className="h-64 min-h-[256px] flex items-center justify-center">
                        {analytics.totalTickets > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.checkInData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        <Cell fill="#16a34a" />
                                        <Cell fill="#3f3f46" />
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-zinc-500">No check-in data</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
