'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toaster';

interface Question {
    id: string;
    eventId: string;
    question: string;
    askerName: string;
    type: 'poll' | 'qna';
    options?: string[];
    votes?: number[];
    answers?: { text: string; authorName: string; createdAt: string }[];
    approved: boolean;
    featured: boolean;
    answered: boolean;
    upvotes: number;
    createdAt: string;
}

interface Event {
    id: string;
    name: string;
}

interface AdminPollManagerProps {
    events: Event[];
}

export default function AdminPollManager({ events }: AdminPollManagerProps) {
    const { showToast } = useToast();
    const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [answeringId, setAnsweringId] = useState<string | null>(null);
    const [newQuestion, setNewQuestion] = useState({
        question: '',
        type: 'poll' as 'poll' | 'qna',
        options: ['', ''],
    });

    const selectedEvent = events.find(e => e.id === selectedEventId);

    const fetchQuestions = async () => {
        if (!selectedEventId) {
            setQuestions([]);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/polls?eventId=${selectedEventId}&all=true`);
            const data = await res.json();
            setQuestions(data.questions || []);
        } catch (err) {
            console.error('Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchQuestions();
    }, [selectedEventId]);

    const handleCreate = async () => {
        if (!newQuestion.question.trim()) {
            showToast('Question is required', 'error');
            return;
        }

        if (newQuestion.type === 'poll' && newQuestion.options.filter(o => o.trim()).length < 2) {
            showToast('Polls need at least 2 options', 'error');
            return;
        }

        try {
            const res = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: selectedEventId,
                    question: newQuestion.question,
                    askerName: 'Admin',
                    type: newQuestion.type,
                    options: newQuestion.type === 'poll' ? newQuestion.options.filter(o => o.trim()) : undefined,
                }),
            });

            if (res.ok) {
                // Auto-approve admin-created items
                const data = await res.json();
                await fetch('/api/polls', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: data.question.id, action: 'approve', data: { approved: true } }),
                });

                showToast('Created and published!', 'success');
                setShowAddModal(false);
                setNewQuestion({ question: '', type: 'poll', options: ['', ''] });
                fetchQuestions();
            }
        } catch (err) {
            showToast('Creation failed', 'error');
        }
    };

    const handleAction = async (questionId: string, action: string, data?: any) => {
        try {
            await fetch('/api/polls', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, action, data }),
            });
            fetchQuestions();
            showToast('Updated!', 'success');
        } catch (err) {
            showToast('Action failed', 'error');
        }
    };

    const handleAnswer = async (questionId: string) => {
        if (!answerText.trim()) return;
        await handleAction(questionId, 'answer', { text: answerText, authorName: 'Admin' });
        setAnswerText('');
        setAnsweringId(null);
    };

    const handleEdit = async () => {
        if (!editingQuestion) return;
        await handleAction(editingQuestion.id, 'edit', {
            question: editingQuestion.question,
            options: editingQuestion.options,
        });
        setShowEditModal(false);
        setEditingQuestion(null);
    };

    const handleDelete = async (questionId: string) => {
        if (!confirm('Delete this item?')) return;
        await fetch(`/api/polls?questionId=${questionId}`, { method: 'DELETE' });
        fetchQuestions();
        showToast('Deleted', 'success');
    };

    const polls = questions.filter(q => q.type === 'poll');
    const qnas = questions.filter(q => q.type === 'qna');
    const pendingCount = questions.filter(q => !q.approved).length;

    return (
        <div className="space-y-6">
            {/* Header with Event Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Live Polls & Q&A</h3>
                        <p className="text-sm text-zinc-400">Manage engagement for your events</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Event Selector */}
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        {events.map(event => (
                            <option key={event.id} value={event.id}>{event.name}</option>
                        ))}
                    </select>

                    {/* Add Button */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={!selectedEventId}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New
                    </button>
                </div>
            </div>

            {/* Stats */}
            {selectedEventId && (
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700">
                        <p className="text-2xl font-bold text-white">{polls.length}</p>
                        <p className="text-xs text-zinc-400">Polls</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700">
                        <p className="text-2xl font-bold text-white">{qnas.length}</p>
                        <p className="text-xs text-zinc-400">Questions</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700">
                        <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
                        <p className="text-xs text-zinc-400">Pending</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center border border-zinc-700">
                        <p className="text-2xl font-bold text-green-400">{questions.filter(q => q.approved).length}</p>
                        <p className="text-xs text-zinc-400">Published</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : !selectedEventId ? (
                <div className="text-center py-12 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    <svg className="w-12 h-12 mx-auto text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-zinc-500">Select an event to manage polls</p>
                </div>
            ) : (
                /* Items List */
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {questions.length === 0 ? (
                        <div className="text-center py-12 bg-zinc-800/50 rounded-xl border border-zinc-700">
                            <svg className="w-12 h-12 mx-auto text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-zinc-500">No polls or questions for {selectedEvent?.name}</p>
                            <p className="text-sm text-zinc-600 mt-1">Click &quot;Add New&quot; to create one</p>
                        </div>
                    ) : (
                        questions.map((q) => (
                            <div
                                key={q.id}
                                className={`bg-zinc-800/30 border rounded-lg p-4 ${!q.approved ? 'border-yellow-600/50' : 'border-zinc-700'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${q.type === 'poll' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}`}>
                                                {q.type === 'poll' ? (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                                {q.type === 'poll' ? 'Poll' : 'Q&A'}
                                            </span>
                                            {!q.approved && <span className="px-2 py-0.5 text-xs rounded bg-yellow-600/20 text-yellow-400">Pending</span>}
                                            {q.featured && (
                                                <span className="text-yellow-400">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-white text-sm font-medium">{q.question}</p>
                                        {q.type === 'poll' && q.votes && (
                                            <p className="text-xs text-zinc-500 mt-1">{q.votes.reduce((a, b) => a + b, 0)} votes</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => handleAction(q.id, 'approve', { approved: !q.approved })}
                                            className={`p-1.5 rounded ${q.approved ? 'text-green-400 bg-green-600/20' : 'text-zinc-400 hover:text-green-400 hover:bg-green-600/10'}`}
                                            title={q.approved ? 'Unpublish' : 'Publish'}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleAction(q.id, 'feature', { featured: !q.featured })}
                                            className={`p-1.5 rounded ${q.featured ? 'text-yellow-400 bg-yellow-600/20' : 'text-zinc-400 hover:text-yellow-400 hover:bg-yellow-600/10'}`}
                                            title="Feature"
                                        >
                                            <svg className="w-4 h-4" fill={q.featured ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => { setEditingQuestion({ ...q }); setShowEditModal(true); }}
                                            className="p-1.5 rounded text-zinc-400 hover:text-blue-400 hover:bg-blue-600/10"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        {q.type === 'qna' && (
                                            <button
                                                onClick={() => setAnsweringId(answeringId === q.id ? null : q.id)}
                                                className="p-1.5 rounded text-zinc-400 hover:text-green-400 hover:bg-green-600/10"
                                                title="Answer"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-600/10"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Answer Input */}
                                {answeringId === q.id && (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                            placeholder="Type your answer..."
                                            className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                        <button
                                            onClick={() => handleAnswer(q.id)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                                        >
                                            Send
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Create New</h3>
                                <p className="text-sm text-zinc-400">{selectedEvent?.name}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setNewQuestion({ ...newQuestion, type: 'poll' })}
                                className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${newQuestion.type === 'poll' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Poll
                            </button>
                            <button
                                onClick={() => setNewQuestion({ ...newQuestion, type: 'qna' })}
                                className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${newQuestion.type === 'qna' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Q&A
                            </button>
                        </div>

                        <textarea
                            placeholder={newQuestion.type === 'poll' ? 'Poll question...' : 'Question...'}
                            value={newQuestion.question}
                            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white h-20 resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />

                        {newQuestion.type === 'poll' && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs text-zinc-400">Poll Options:</p>
                                {newQuestion.options.map((opt, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const opts = [...newQuestion.options];
                                            opts[idx] = e.target.value;
                                            setNewQuestion({ ...newQuestion, options: opts });
                                        }}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                ))}
                                <button
                                    onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}
                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add option
                                </button>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-zinc-700 text-white rounded-lg hover:bg-zinc-800">
                                Cancel
                            </button>
                            <button onClick={handleCreate} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                Create & Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingQuestion && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white">Edit</h3>
                        </div>

                        <textarea
                            value={editingQuestion.question}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white h-20 resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />

                        {editingQuestion.type === 'poll' && editingQuestion.options && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs text-zinc-400">Options:</p>
                                {editingQuestion.options.map((opt, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                            const opts = [...(editingQuestion.options || [])];
                                            opts[idx] = e.target.value;
                                            setEditingQuestion({ ...editingQuestion, options: opts });
                                        }}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => { setShowEditModal(false); setEditingQuestion(null); }} className="flex-1 py-2 border border-zinc-700 text-white rounded-lg hover:bg-zinc-800">
                                Cancel
                            </button>
                            <button onClick={handleEdit} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
