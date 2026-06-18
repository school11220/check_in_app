'use client';

import { useEffect, useState } from 'react';
import {Plus, Trash2, Save, X, Edit, Mail, Loader2, Eye, EyeOff} from '@/components/icons';
import { useToast } from '@/components/Toaster';

interface EmailTemplate {
    id: string;
    name: string;
    type: string;
    subject: string;
    body: string;
    isActive: boolean;
}

const TEMPLATE_TYPES = [
    { value: 'confirmation', label: 'Booking confirmation' },
    { value: 'reminder', label: 'Event reminder' },
    { value: 'thankyou', label: 'Thank you / follow-up' },
    { value: 'custom', label: 'Custom' },
] as const;

const PLACEHOLDERS_HELP = [
    '{{attendeeName}}', '{{eventName}}', '{{eventDate}}', '{{eventVenue}}',
    '{{ticketId}}', '{{ticketUrl}}',
];

function newTemplate(): EmailTemplate {
    return {
        id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: 'New template',
        type: 'custom',
        subject: '',
        body: 'Hi {{attendeeName}},\n\nThanks for booking {{eventName}}.',
        isActive: true,
    };
}

export default function EmailTemplatesManager() {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<EmailTemplate | null>(null);
    const [previewing, setPreviewing] = useState(false);

    useEffect(() => {
        fetch('/api/admin/email-templates')
            .then((r) => r.json())
            .then((d) => setTemplates(Array.isArray(d) ? d : []))
            .catch(() => showToast('Failed to load templates', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const startNew = () => {
        const t = newTemplate();
        setDraft(t);
        setEditingId(t.id);
    };
    const startEdit = (t: EmailTemplate) => {
        setDraft({ ...t });
        setEditingId(t.id);
    };
    const cancelEdit = () => {
        setDraft(null);
        setEditingId(null);
    };

    const addNew = () => {
        if (!draft) return;
        setTemplates((prev) => [...prev, draft]);
        setDraft(null);
        setEditingId(null);
    };
    const saveExisting = async () => {
        if (!draft) return;
        setTemplates((prev) => prev.map((t) => (t.id === draft.id ? draft : t)));
        setDraft(null);
        setEditingId(null);
        await persist();
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this template? This cannot be undone.')) return;
        const prev = templates;
        setTemplates((p) => p.filter((t) => t.id !== id));
        try {
            const res = await fetch('/api/admin/email-templates', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error('failed');
            showToast('Template deleted', 'success');
        } catch {
            setTemplates(prev);
            showToast('Delete failed', 'error');
        }
    };

    const persist = async (next?: EmailTemplate[]) => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/email-templates', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templates: next ?? templates }),
            });
            if (!res.ok) throw new Error('failed');
            showToast('Templates saved', 'success');
        } catch {
            showToast('Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = (id: string) => {
        setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)));
    };

    const renderPreview = (body: string) => {
        // Tiny placeholder preview, so the user can see what an email looks like.
        return body
            .replaceAll('{{attendeeName}}', 'Jane Doe')
            .replaceAll('{{eventName}}', 'Sample Event')
            .replaceAll('{{eventDate}}', 'Sat, Jul 5 · 6:00 PM')
            .replaceAll('{{eventVenue}}', 'Convention Center')
            .replaceAll('{{ticketId}}', 'tk_abc12345')
            .replaceAll('{{ticketUrl}}', 'https://example.com/ticket/tk_abc12345');
    };

    if (loading) {
        return (
            <div className="text-center py-10 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading templates…
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-red-500" /> Email Templates
                    </h3>
                    <p className="text-zinc-400 text-sm">Confirmation, reminder, and custom messages your attendees receive.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => persist()}
                        disabled={saving}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>
                    <button
                        onClick={startNew}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> New template
                    </button>
                </div>
            </div>

            {/* Editor card */}
            {draft && (
                <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                            <input
                                value={draft.name}
                                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Type</label>
                            <select
                                value={draft.type}
                                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
                            >
                                {TEMPLATE_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Subject</label>
                            <input
                                value={draft.subject}
                                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Body</label>
                        <textarea
                            value={draft.body}
                            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                            rows={8}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500/50"
                        />
                        <p className="mt-1 text-[11px] text-zinc-500">
                            Placeholders: {PLACEHOLDERS_HELP.map((p) => <code key={p} className="mr-1.5 bg-zinc-800 px-1 rounded">{p}</code>)}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <button
                            onClick={() => setPreviewing((v) => !v)}
                            className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white text-xs flex items-center gap-1"
                        >
                            {previewing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {previewing ? 'Hide preview' : 'Preview'}
                        </button>
                        <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white text-xs">Cancel</button>
                        {templates.find((t) => t.id === draft.id) ? (
                            <button onClick={saveExisting} className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs">Save changes</button>
                        ) : (
                            <button onClick={addNew} className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs">Add template</button>
                        )}
                    </div>
                    {previewing && (
                        <div className="mt-3 border-t border-zinc-800 pt-3">
                            <p className="text-xs text-zinc-500 mb-1">Preview (sample values)</p>
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 whitespace-pre-wrap font-mono">
                                {renderPreview(draft.body)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {templates.length === 0 ? (
                <div className="bg-zinc-900/40 border border-dashed border-zinc-700 rounded-2xl p-10 text-center">
                    <Mail className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-300 font-medium">No email templates yet</p>
                    <p className="text-zinc-500 text-sm mb-4">Create one to personalize what attendees see in their inbox.</p>
                    <button onClick={startNew} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm inline-flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> New template
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {templates.map((t) => (
                        <div key={t.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-white font-medium truncate">{t.name}</p>
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{t.type}</span>
                                    {!t.isActive && <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">Disabled</span>}
                                </div>
                                <p className="text-zinc-400 text-xs truncate mt-0.5">{t.subject || <em>no subject</em>}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => toggleActive(t.id)}
                                    className="text-xs px-2 py-1 rounded-lg text-zinc-300 hover:text-white"
                                >
                                    {t.isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    onClick={() => startEdit(t)}
                                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                                    aria-label="Edit"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => remove(t.id)}
                                    className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                                    aria-label="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
