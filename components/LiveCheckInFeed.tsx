'use client';

import { useApp } from '@/lib/store';

interface CheckInActivity {
    id: string;
    ticketId: string;
    attendeeName: string;
    eventName: string;
    timestamp: Date;
    action: 'check_in' | 'check_out';
}

interface LiveCheckInFeedProps {
    eventId?: string;
    maxItems?: number;
}

export default function LiveCheckInFeed({ eventId, maxItems = 10 }: LiveCheckInFeedProps) {
    const { tickets, events } = useApp();
    const activities: CheckInActivity[] = tickets
        .filter(t => t.checkedIn && t.status === 'paid')
        .filter(t => !eventId || t.eventId === eventId)
        .map(t => {
            const event = events.find(e => e.id === t.eventId);
            return {
                id: t.id,
                ticketId: t.id,
                attendeeName: t.name,
                eventName: event?.name || 'Event',
                timestamp: new Date(t.createdAt),
                action: 'check_in' as const,
            };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, maxItems);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    if (activities.length === 0) {
        return (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 text-center">
                <svg className="w-12 h-12 mx-auto text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-zinc-500">No check-ins yet</p>
                <p className="text-zinc-600 text-sm">Check-ins will appear here in real-time</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Check-ins
                </h3>
                <span className="text-xs text-zinc-500">{activities.length} recent</span>
            </div>

            <div className="divide-y divide-zinc-700/50 max-h-96 overflow-y-auto">
                {activities.map((activity, index) => (
                    <div
                        key={activity.id}
                        className={`px-4 py-3 flex items-center gap-3 ${index === 0 ? 'bg-green-900/20' : 'hover:bg-zinc-800/50'} transition-colors`}
                    >
                        <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{activity.attendeeName}</p>
                            <p className="text-sm text-zinc-500 truncate">{activity.eventName}</p>
                        </div>
                        <span className="text-xs text-zinc-500 flex-shrink-0">{formatTime(activity.timestamp)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
