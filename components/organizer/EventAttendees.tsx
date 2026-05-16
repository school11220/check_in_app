'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Copy, Mail, Phone, User, Calendar, Send, ReceiptText } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import TicketActions from '@/components/TicketActions';

interface Ticket {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    status: string;
    lifecycleStatus?: string;
    checkedIn: boolean;
    amountPaid?: number;
    grossAmount?: number;
    discountAmount?: number;
    refundedAmount?: number;
    lastDeliveredAt?: string | null;
    deliveryCount?: number;
    deliveryHistory?: { id: string; channel: string; success: boolean; createdAt: string; error?: string | null }[];
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
    const [statusFilter, setStatusFilter] = useState('all');
    const [resendingId, setResendingId] = useState<string | null>(null);

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

    const filteredTickets = tickets.filter(t => {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
            t.name?.toLowerCase().includes(query) ||
            t.email?.toLowerCase().includes(query) ||
            t.phone?.includes(searchTerm) ||
            t.id?.toLowerCase().includes(query);
        const lifecycle = t.lifecycleStatus || (t.checkedIn ? 'checked_in' : t.status);
        const matchesStatus = statusFilter === 'all' || lifecycle === statusFilter || t.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    const formatMoney = (amount = 0) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount / 100);

    const getStatusClass = (ticket: Ticket) => {
        const lifecycle = ticket.lifecycleStatus || (ticket.checkedIn ? 'checked_in' : ticket.status);
        if (lifecycle === 'checked_in' || ticket.status === 'paid') return 'bg-green-500/10 text-green-500 border border-green-500/20';
        if (ticket.status === 'partially_refunded') return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
        if (ticket.status === 'refunded') return 'bg-red-500/10 text-red-400 border border-red-500/20';
        return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    };

    const handleResend = async (ticket: Ticket) => {
        setResendingId(ticket.id);
        try {
            const res = await fetch('/api/tickets/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: ticket.id, sendEmail: true, sendSMS: false }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Ticket resend queued', 'success');
                await fetchTickets();
            } else {
                showToast(data.error || 'Failed to resend ticket', 'error');
            }
        } catch {
            showToast('Failed to resend ticket', 'error');
        } finally {
            setResendingId(null);
        }
    };

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
            t.lifecycleStatus || t.status,
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

    if (loading) return (
        <div className="text-center py-10 text-[#737373]">
            <div className="w-8 h-8 border-2 border-[#E11D2E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading attendees...
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
                    <input
                        type="text"
                        placeholder="Search attendees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white placeholder-[#737373] focus:outline-none focus:border-[#E11D2E]"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="px-3 py-2.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl text-white focus:outline-none focus:border-[#E11D2E] text-sm"
                >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partially_refunded">Partial refund</option>
                    <option value="refunded">Refunded</option>
                    <option value="checked_in">Checked in</option>
                </select>
                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleCopyEmails}
                        className="px-4 py-2.5 bg-[#1A1A1A] border border-[#1F1F1F] text-[#B3B3B3] rounded-xl hover:bg-[#222] hover:text-white transition-colors flex items-center gap-2 text-sm"
                    >
                        <Copy className="w-4 h-4" /> Copy Emails
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2.5 bg-[#E11D2E]/20 text-[#E11D2E] border border-[#E11D2E]/30 rounded-xl hover:bg-[#E11D2E]/30 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Attendee List */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-dashed border-[#1F1F1F]">
                        <User className="w-10 h-10 text-[#737373] mx-auto mb-3" />
                        <p className="text-[#737373]">No attendees found.</p>
                    </div>
                ) : (
                    filteredTickets.map(ticket => (
                        <div key={ticket.id} className="p-4 bg-[#1A1A1A] border border-[#1F1F1F] rounded-xl hover:border-[#E11D2E]/30 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                                {/* Avatar + Info */}
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-[#E11D2E]/20 flex items-center justify-center text-[#E11D2E] font-bold flex-shrink-0">
                                        {ticket.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-white font-medium truncate">{ticket.name}</h4>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-[#737373] mt-1">
                                            {ticket.email && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{ticket.email}</span>
                                                </span>
                                            )}
                                            {ticket.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                                    {ticket.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Status + Date */}
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(ticket)}`}>
                                        {(ticket.lifecycleStatus || ticket.status)?.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-[#737373] flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] border-t border-[#1F1F1F] pt-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="flex items-center gap-1 text-[#737373]">
                                        <ReceiptText className="w-3 h-3" />
                                        Paid <span className="text-white">{formatMoney(ticket.amountPaid)}</span>
                                    </div>
                                    <div className="text-[#737373]">Discount <span className="text-white">{formatMoney(ticket.discountAmount)}</span></div>
                                    <div className="text-[#737373]">Refunded <span className="text-white">{formatMoney(ticket.refundedAmount)}</span></div>
                                    <div className="text-[#737373]">
                                        Sent <span className="text-white">{ticket.deliveryCount || 0}</span>
                                        {ticket.lastDeliveredAt ? <span className="ml-1">({new Date(ticket.lastDeliveredAt).toLocaleDateString()})</span> : null}
                                    </div>
                                </div>
                                {ticket.deliveryHistory && ticket.deliveryHistory.length > 0 && (
                                    <div className="mt-2 text-[11px] text-[#737373] lg:col-span-2">
                                        Last resend: {ticket.deliveryHistory[0].channel} {ticket.deliveryHistory[0].success ? 'sent' : 'failed'} on {new Date(ticket.deliveryHistory[0].createdAt).toLocaleString()}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                                    <button
                                        onClick={() => handleResend(ticket)}
                                        disabled={resendingId === ticket.id || !ticket.email || !['paid', 'partially_refunded'].includes(ticket.status)}
                                        className="px-3 py-1.5 bg-[#E11D2E]/10 text-[#FF6B7A] border border-[#E11D2E]/30 rounded-lg hover:bg-[#E11D2E]/20 disabled:opacity-50 text-sm flex items-center gap-1"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {resendingId === ticket.id ? 'Sending...' : 'Resend'}
                                    </button>
                                    <TicketActions
                                        ticketId={ticket.id}
                                        ticketStatus={ticket.status}
                                        isCheckedIn={ticket.checkedIn}
                                        attendeeName={ticket.name}
                                        attendeeEmail={ticket.email}
                                        onActionComplete={fetchTickets}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            <div className="pt-3 border-t border-[#1F1F1F] flex justify-between text-sm text-[#737373]">
                <span>Total: <span className="text-white">{tickets.length}</span></span>
                <span>Filtered: <span className="text-white">{filteredTickets.length}</span></span>
            </div>
        </div>
    );
}
