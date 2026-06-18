'use client';

import { useEffect, useState } from 'react';
import {Mail, Send, Loader2, X, RefreshCw, Mail as MailIcon} from '@/components/icons';
import { useToast } from '@/components/Toaster';

interface Message {
    id: string;
    threadKey: string;
    fromEmail: string;
    fromName: string | null;
    toEmail: string;
    subject: string;
    body: string;
    isInbound: boolean;
    isRead: boolean;
    receivedAt: string;
    ticketId: string | null;
    eventId: string | null;
}

interface ThreadSummary extends Message {
    // Same shape; this is the "head" of the thread.
}

export default function Inbox() {
    const { showToast } = useToast();
    const [threads, setThreads] = useState<ThreadSummary[]>([]);
    const [unread, setUnread] = useState(0);
    const [active, setActive] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const loadThreads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter === 'unread') params.set('unreadOnly', '1');
            const res = await fetch(`/api/admin/messages?${params}`);
            const data = await res.json();
            setThreads(data.threads || []);
            setUnread(data.unread || 0);
        } catch {
            showToast('Failed to load inbox', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadThreads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const openThread = async (key: string) => {
        setActive(key);
        setLoadingThread(true);
        try {
            const res = await fetch(`/api/admin/messages?threadKey=${encodeURIComponent(key)}`);
            const data = await res.json();
            setMessages(data.messages || []);
            // mark unread inbound messages as read
            const unreadIds = (data.messages as Message[])
                .filter((m) => m.isInbound && !m.isRead)
                .map((m) => m.id);
            if (unreadIds.length) {
                await fetch('/api/admin/messages', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: unreadIds }),
                });
                loadThreads();
            }
        } catch {
            showToast('Failed to load thread', 'error');
        } finally {
            setLoadingThread(false);
        }
    };

    const sendReply = async () => {
        if (!active || !reply.trim()) return;
        const head = messages[messages.length - 1];
        if (!head) return;
        setSending(true);
        try {
            const res = await fetch('/api/admin/messages?action=reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadKey: active,
                    toEmail: head.fromEmail,
                    subject: head.subject,
                    body: reply.trim(),
                    ticketId: head.ticketId || undefined,
                    eventId: head.eventId || undefined,
                }),
            });
            if (res.ok) {
                setReply('');
                showToast('Reply sent', 'success');
                await openThread(active);
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to send', 'error');
            }
        } catch {
            showToast('Failed to send reply', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-red-500" /> Attendee Inbox
                    </h3>
                    <p className="text-zinc-400 text-sm">
                        Replies from attendees land here. {unread > 0 && <span className="text-red-400 font-medium">{unread} unread</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg ${filter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>All</button>
                        <button onClick={() => setFilter('unread')} className={`px-3 py-1.5 rounded-lg ${filter === 'unread' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Unread</button>
                    </div>
                    <button onClick={loadThreads} className="p-2 text-zinc-400 hover:text-white" aria-label="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-[1fr_2fr] gap-4 min-h-[400px]">
                {/* Thread list */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-6 text-center text-zinc-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" /> Loading…
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-10 text-center">
                            <MailIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-zinc-300 text-sm font-medium">No messages</p>
                            <p className="text-zinc-500 text-xs mt-1">When attendees reply to emails you&apos;ve sent, the messages will appear here.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-zinc-800 max-h-[560px] overflow-y-auto">
                            {threads.map((t) => (
                                <li key={t.id}>
                                    <button
                                        onClick={() => openThread(t.threadKey)}
                                        className={`w-full text-left p-3 hover:bg-zinc-800/60 transition ${active === t.threadKey ? 'bg-zinc-800/80' : ''} ${!t.isRead ? 'border-l-2 border-red-500' : ''}`}
                                    >
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-white text-sm font-medium truncate">{t.fromName || t.fromEmail}</p>
                                            <p className="text-[10px] text-zinc-500 shrink-0">{new Date(t.receivedAt).toLocaleDateString()}</p>
                                        </div>
                                        <p className="text-zinc-300 text-xs truncate mt-0.5">{t.subject}</p>
                                        <p className="text-zinc-500 text-[11px] truncate mt-0.5">{t.body.slice(0, 80)}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Thread view */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-col">
                    {!active ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                            Select a conversation to read
                        </div>
                    ) : loadingThread ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`max-w-[80%] rounded-2xl p-3 text-sm ${m.isInbound ? 'bg-zinc-800 text-zinc-100' : 'bg-red-600/20 text-white ml-auto border border-red-500/30'}`}
                                    >
                                        <div className="text-[10px] text-zinc-400 mb-1 flex items-center gap-2">
                                            <span className="font-medium">{m.isInbound ? (m.fromName || m.fromEmail) : 'You'}</span>
                                            <span>{new Date(m.receivedAt).toLocaleString()}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap">{m.body}</p>
                                    </div>
                                ))}
                                {messages.length === 0 && <p className="text-zinc-500 text-sm text-center">No messages in this thread.</p>}
                            </div>
                            <div className="border-t border-zinc-800 p-3">
                                <textarea
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    rows={3}
                                    placeholder="Write a reply…"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none"
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={sendReply}
                                        disabled={!reply.trim() || sending}
                                        className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        Send reply
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <p className="text-[11px] text-zinc-500">
                To have replies routed into this inbox automatically, point your email provider&apos;s inbound webhook at <code className="bg-zinc-800 px-1 rounded">POST /api/admin/messages</code>.
            </p>
        </div>
    );
}
