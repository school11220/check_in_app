'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toaster';
import { MessageSquare, HelpCircle, BarChart3, Pencil, Star } from 'lucide-react';

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

interface LivePollQAProps {
    eventId: string;
    isAdmin?: boolean;
    userName?: string;
}

export default function LivePollQA({ eventId, isAdmin = false, userName = '' }: LivePollQAProps) {
    const { showToast } = useToast();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'qna' | 'polls'>('qna');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [newQuestion, setNewQuestion] = useState({
        question: '',
        name: userName,
        type: 'qna' as 'poll' | 'qna',
        options: ['', ''],
    });
    const [answerText, setAnswerText] = useState('');
    const [answeringId, setAnsweringId] = useState<string | null>(null);

    const fetchQuestions = async () => {
        try {
            const res = await fetch(`/api/polls?eventId=${eventId}${isAdmin ? '&all=true' : ''}`);
            const data = await res.json();
            setQuestions(data.questions || []);
        } catch (err) {
            console.error('Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
        const interval = setInterval(fetchQuestions, 5000);
        return () => clearInterval(interval);
    }, [eventId, isAdmin]);

    const handleSubmit = async () => {
        if (!newQuestion.question || !newQuestion.name) {
            showToast('Question and name are required', 'error');
            return;
        }

        try {
            const res = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    question: newQuestion.question,
                    askerName: newQuestion.name,
                    type: newQuestion.type,
                    options: newQuestion.type === 'poll' ? newQuestion.options.filter(o => o.trim()) : undefined,
                }),
            });

            if (res.ok) {
                showToast('Submitted! Awaiting approval.', 'success');
                setShowAddModal(false);
                setNewQuestion({ question: '', name: userName, type: 'qna', options: ['', ''] });
                fetchQuestions();
            }
        } catch (err) {
            showToast('Submission failed', 'error');
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
        } catch (err) {
            showToast('Action failed', 'error');
        }
    };

    const handleVote = async (questionId: string, optionIndex: number) => {
        await handleAction(questionId, 'vote', { optionIndex });
        showToast('Vote recorded!', 'success');
    };

    const handleAnswer = async (questionId: string) => {
        if (!answerText.trim()) return;
        await handleAction(questionId, 'answer', { text: answerText, authorName: 'Admin' });
        setAnswerText('');
        setAnsweringId(null);
        showToast('Answer posted!', 'success');
    };

    const handleEdit = async () => {
        if (!editingQuestion) return;
        await handleAction(editingQuestion.id, 'edit', {
            question: editingQuestion.question,
            options: editingQuestion.options,
        });
        setShowEditModal(false);
        setEditingQuestion(null);
        showToast('Question updated!', 'success');
    };

    const handleDelete = async (questionId: string) => {
        if (!confirm('Delete this question?')) return;
        await fetch(`/api/polls?questionId=${questionId}`, { method: 'DELETE' });
        fetchQuestions();
        showToast('Question deleted', 'success');
    };

    const filteredQuestions = questions.filter(q =>
        activeTab === 'qna' ? q.type === 'qna' : q.type === 'poll'
    );

    const getTotalVotes = (votes: number[] = []) => votes.reduce((a, b) => a + b, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-red-400" />
                    Live Q&A & Polls
                </h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ask / Create
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-zinc-800 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('qna')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'qna' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    Questions ({questions.filter(q => q.type === 'qna').length})
                </button>
                <button
                    onClick={() => setActiveTab('polls')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'polls' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    Polls ({questions.filter(q => q.type === 'poll').length})
                </button>
            </div>

            {/* Questions/Polls List */}
            <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                        <p className="text-zinc-400">No {activeTab === 'qna' ? 'questions' : 'polls'} yet.</p>
                    </div>
                ) : (
                    filteredQuestions.map((q) => (
                        <div
                            key={q.id}
                            className={`bg-zinc-800/50 border rounded-xl p-4 ${q.featured ? 'border-yellow-500' : !q.approved ? 'border-yellow-600/50' : 'border-zinc-700'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {q.featured && <Star className="w-4 h-4 text-yellow-400" />}
                                    {!q.approved && <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded">Pending</span>}
                                    <span className="text-zinc-400 text-sm">by {q.askerName}</span>
                                </div>

                                {isAdmin && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleAction(q.id, 'approve', { approved: !q.approved })}
                                            className={`p-1.5 rounded-lg ${q.approved ? 'bg-green-600/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}
                                            title={q.approved ? 'Hide' : 'Approve'}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleAction(q.id, 'feature', { featured: !q.featured })}
                                            className={`p-1.5 rounded-lg ${q.featured ? 'bg-yellow-600/20 text-yellow-400' : 'bg-zinc-700 text-zinc-400'}`}
                                            title="Feature"
                                        >
                                            <Star className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setEditingQuestion({ ...q }); setShowEditModal(true); }}
                                            className="p-1.5 rounded-lg bg-zinc-700 text-zinc-400 hover:text-blue-400"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            className="p-1.5 rounded-lg bg-zinc-700 text-zinc-400 hover:text-red-400"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Question Text */}
                            <p className="text-white text-lg font-medium mb-3">{q.question}</p>

                            {/* Poll Options */}
                            {q.type === 'poll' && q.options && (
                                <div className="space-y-2 mb-3">
                                    {q.options.map((option, idx) => {
                                        const total = getTotalVotes(q.votes);
                                        const percent = total > 0 ? ((q.votes?.[idx] || 0) / total * 100) : 0;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleVote(q.id, idx)}
                                                className="w-full relative overflow-hidden bg-zinc-700 hover:bg-zinc-600 rounded-lg p-3 text-left transition-colors"
                                            >
                                                <div
                                                    className="absolute inset-0 bg-red-600/30"
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                                <div className="relative flex justify-between">
                                                    <span className="text-white">{option}</span>
                                                    <span className="text-zinc-400">{percent.toFixed(0)}%</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    <p className="text-xs text-zinc-500 text-center">{getTotalVotes(q.votes)} votes</p>
                                </div>
                            )}

                            {/* Q&A Answers */}
                            {q.type === 'qna' && q.answers && q.answers.length > 0 && (
                                <div className="space-y-2 mb-3 pl-4 border-l-2 border-green-600">
                                    {q.answers.map((ans, idx) => (
                                        <div key={idx} className="bg-green-900/20 rounded-lg p-3">
                                            <p className="text-green-300">{ans.text}</p>
                                            <p className="text-xs text-green-500 mt-1">— {ans.authorName}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upvote & Answer (Admin) */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => handleAction(q.id, 'upvote')}
                                    className="flex items-center gap-1 text-zinc-400 hover:text-red-400"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    <span>{q.upvotes}</span>
                                </button>

                                {isAdmin && q.type === 'qna' && (
                                    answeringId === q.id ? (
                                        <div className="flex gap-2 flex-1 ml-4">
                                            <input
                                                type="text"
                                                value={answerText}
                                                onChange={(e) => setAnswerText(e.target.value)}
                                                placeholder="Type your answer..."
                                                className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                                            />
                                            <button
                                                onClick={() => handleAnswer(q.id)}
                                                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
                                            >
                                                Send
                                            </button>
                                            <button
                                                onClick={() => { setAnsweringId(null); setAnswerText(''); }}
                                                className="px-3 py-2 bg-zinc-600 text-white rounded-lg text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAnsweringId(q.id)}
                                            className="px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm"
                                        >
                                            Answer
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Question Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {newQuestion.type === 'qna' ? (
                                <span className="inline-flex items-center gap-2"><HelpCircle className="w-5 h-5" /> Ask a Question</span>
                            ) : (
                                <span className="inline-flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Create a Poll</span>
                            )}
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setNewQuestion({ ...newQuestion, type: 'qna' })}
                                className={`flex-1 py-2 rounded-lg ${newQuestion.type === 'qna' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                            >
                                Question
                            </button>
                            <button
                                onClick={() => setNewQuestion({ ...newQuestion, type: 'poll' })}
                                className={`flex-1 py-2 rounded-lg ${newQuestion.type === 'poll' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                            >
                                Poll
                            </button>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Your name"
                                value={newQuestion.name}
                                onChange={(e) => setNewQuestion({ ...newQuestion, name: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                            />
                            <textarea
                                placeholder={newQuestion.type === 'qna' ? 'Your question...' : 'Poll question...'}
                                value={newQuestion.question}
                                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white h-24 resize-none"
                            />

                            {newQuestion.type === 'poll' && (
                                <div className="space-y-2">
                                    <p className="text-sm text-zinc-400">Options:</p>
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
                                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                                        />
                                    ))}
                                    <button
                                        onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}
                                        className="text-sm text-red-400 hover:text-red-300"
                                    >
                                        + Add option
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-zinc-700 text-white rounded-xl">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} className="flex-1 py-3 bg-red-600 text-white rounded-xl">
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingQuestion && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4 inline-flex items-center gap-2">
                            <Pencil className="w-5 h-5" />
                            Edit Question
                        </h3>

                        <div className="space-y-3">
                            <textarea
                                value={editingQuestion.question}
                                onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white h-24 resize-none"
                            />

                            {editingQuestion.type === 'poll' && editingQuestion.options && (
                                <div className="space-y-2">
                                    <p className="text-sm text-zinc-400">Options:</p>
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
                                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setShowEditModal(false); setEditingQuestion(null); }} className="flex-1 py-3 border border-zinc-700 text-white rounded-xl">
                                Cancel
                            </button>
                            <button onClick={handleEdit} className="flex-1 py-3 bg-red-600 text-white rounded-xl">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
