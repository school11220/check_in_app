'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Copy, Check, Mail, Phone, User, Ticket } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface Ticket {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    createdAt: string;
}

interface EventAttendeesProps {
    eventId: string;
    onClose: () => void;
}

export default function EventAttendees({ eventId }: EventAttendeesProps) {
    const { showToast } = useToast();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTickets();
    }, [eventId]);

    const fetchTickets = async () => {
        try {
            const res = await fetch(`/api/tickets?eventId=${eventId}`);
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            showToast('Failed to load attendees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredTickets = tickets.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.phone?.includes(searchTerm)
    );

    const handleCopyEmails = () => {
        const emails = filteredTickets.map(t => t.email).filter(Boolean).join(', ');
        navigator.clipboard.writeText(emails);
        showToast('Emails copied to clipboard', 'success');
    };

    const handleExport = () => {
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Registered At'];
        const rows = filteredTickets.map(t => [
            t.id,
            t.name,
            t.email || '',
            t.phone || '',
            t.status,
            new Date(t.createdAt).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendees-${eventId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Attendees exported successfully', 'success');
    };

    if (loading) return <div className="text-center py-10 text-zinc-500">Loading attendees...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search attendees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopyEmails}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-2 text-sm"
                        title="Copy all emails"
                    >
                        <Copy className="w-4 h-4" /> Copy Emails
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-xl hover:bg-blue-600/30 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTickets.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                        <User className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500">No attendees found.</p>
                    </div>
                ) : (
                    filteredTickets.map(ticket => (
                        <div key={ticket.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                                    {ticket.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">{ticket.name}</h4>
                                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                        {ticket.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {ticket.email}
                                            </span>
                                        )}
                                        {ticket.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {ticket.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${ticket.status === 'confirmed' || ticket.status === 'checked-in'
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    }`}>
                                    {ticket.status.toUpperCase()}
                                </span>
                                <span className="text-xs text-zinc-600">
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-between text-sm text-zinc-500">
                <span>Total Attendees: {tickets.length}</span>
                <span>Filtered: {filteredTickets.length}</span>
            </div>
        </div>
    );
}
