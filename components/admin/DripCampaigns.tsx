'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Pause, Mail, ChevronDown, ChevronRight, X, Loader2, Edit, Save } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useToast } from '@/components/Toaster';

interface DripStep {
    id: string;
    triggerType: 'register' | 'daysBeforeEvent' | 'daysAfterEvent';
    offsetDays: number;
    templateId: string;
    label: string;
}

interface Campaign {
    id: string;
    name: string;
    eventId: string;
    steps: DripStep[];
    isActive: boolean;
    createdAt: string;
}

const TRIGGER_LABELS: Record<DripStep['triggerType'], string> = {
    register: 'On Registration',
    daysBeforeEvent: 'Days Before Event',
    daysAfterEvent: 'Days After Event',
};

export default function DripCampaigns() {
    const { events, emailTemplates } = useApp();
    const { showToast } = useToast();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // New campaign form state
    const [newName, setNewName] = useState('');
    const [newEventId, setNewEventId] = useState('');
    const [newSteps, setNewSteps] = useState<Omit<DripStep, 'id'>[]>([
        { triggerType: 'register', offsetDays: 0, templateId: '', label: 'Welcome email' },
        { triggerType: 'daysBeforeEvent', offsetDays: 7, templateId: '', label: 'One week reminder' },
        { triggerType: 'daysBeforeEvent', offsetDays: 1, templateId: '', label: 'Day before reminder' },
        { triggerType: 'daysAfterEvent', offsetDays: 1, templateId: '', label: 'Post-event survey' },
    ]);

    const activeTemplates = emailTemplates.filter((t: any) => t.isActive);

    useEffect(() => {
        fetch('/api/admin/campaigns')
            .then(r => r.json())
            .then(data => setCampaigns(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    const createCampaign = async () => {
        if (!newName.trim() || !newEventId) {
            showToast('Please fill in name and event', 'error');
            return;
        }
        const stepsWithIds = newSteps.map((s, i) => ({ ...s, id: `step-${Date.now()}-${i}` }));
        const res = await fetch('/api/admin/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, eventId: newEventId, steps: stepsWithIds, isActive: true }),
        });
        if (res.ok) {
            const created = await res.json();
            setCampaigns(prev => [created, ...prev]);
            setShowNew(false);
            setNewName('');
            setNewEventId('');
            showToast('Campaign created!', 'success');
        } else {
            showToast('Failed to create campaign', 'error');
        }
    };

    const toggleActive = async (campaign: Campaign) => {
        const res = await fetch('/api/admin/campaigns', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: campaign.id, isActive: !campaign.isActive }),
        });
        if (res.ok) {
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, isActive: !c.isActive } : c));
        }
    };

    const deleteCampaign = async (id: string) => {
        const res = await fetch('/api/admin/campaigns', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            setCampaigns(prev => prev.filter(c => c.id !== id));
            showToast('Campaign deleted', 'success');
        }
    };

    const runNow = async () => {
        setRunning(true);
        const res = await fetch('/api/admin/campaigns/process', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(`Processed: ${data.totalSent} emails sent`, 'success');
        } else {
            showToast(data.error || 'Failed to run campaigns', 'error');
        }
        setRunning(false);
    };

    const updateStep = (i: number, key: keyof Omit<DripStep, 'id'>, value: string | number) => {
        setNewSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s));
    };

    const addStep = () => {
        setNewSteps(prev => [...prev, { triggerType: 'daysBeforeEvent', offsetDays: 3, templateId: '', label: 'New step' }]);
    };

    const removeStep = (i: number) => {
        setNewSteps(prev => prev.filter((_, idx) => idx !== i));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white">Drip Email Campaigns</h3>
                    <p className="text-zinc-400 text-sm">Automated email sequences tied to event lifecycle</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={runNow}
                        disabled={running || campaigns.filter(c => c.isActive).length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-700/30 hover:bg-green-700/50 border border-green-600/40 text-green-300 text-sm rounded-xl transition disabled:opacity-40"
                    >
                        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Run Now
                    </button>
                    <button
                        onClick={() => setShowNew(!showNew)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl transition"
                    >
                        <Plus className="w-4 h-4" /> New Campaign
                    </button>
                </div>
            </div>

            {/* Cron hint */}
            <div className="p-3 bg-zinc-800/50 border border-zinc-700/40 rounded-xl text-xs text-zinc-400">
                💡 For automatic sending, call <code className="bg-zinc-700 text-zinc-200 px-1 py-0.5 rounded">POST /api/admin/campaigns/process</code> via a cron job (e.g.{' '}
                <code className="bg-zinc-700 text-zinc-200 px-1 py-0.5 rounded">vercel.json</code> cron, GitHub Actions, or a scheduler).
            </div>

            {/* New campaign form */}
            {showNew && (
                <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-5 space-y-4">
                    <h4 className="text-white font-semibold">Create New Campaign</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Campaign Name</label>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. TechConf 2025 Drip"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Event</label>
                            <select
                                value={newEventId}
                                onChange={e => setNewEventId(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
                            >
                                <option value="">— Select event —</option>
                                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Steps */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-zinc-400 uppercase tracking-wider">Campaign Steps</label>
                            <button onClick={addStep} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add step
                            </button>
                        </div>
                        <div className="space-y-2">
                            {newSteps.map((step, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3">
                                    <div className="col-span-12 sm:col-span-3">
                                        <select
                                            value={step.triggerType}
                                            onChange={e => updateStep(i, 'triggerType', e.target.value as DripStep['triggerType'])}
                                            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                                        >
                                            {(Object.entries(TRIGGER_LABELS) as [DripStep['triggerType'], string][]).map(([k, l]) => (
                                                <option key={k} value={k}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {step.triggerType !== 'register' && (
                                        <div className="col-span-4 sm:col-span-2">
                                            <input
                                                type="number"
                                                min={0}
                                                value={step.offsetDays}
                                                onChange={e => updateStep(i, 'offsetDays', parseInt(e.target.value) || 0)}
                                                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                                                placeholder="Days"
                                            />
                                        </div>
                                    )}
                                    <div className={`${step.triggerType === 'register' ? 'col-span-12 sm:col-span-5' : 'col-span-8 sm:col-span-4'}`}>
                                        <select
                                            value={step.templateId}
                                            onChange={e => updateStep(i, 'templateId', e.target.value)}
                                            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                                        >
                                            <option value="">— Template —</option>
                                            {activeTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-10 sm:col-span-2">
                                        <input
                                            value={step.label}
                                            onChange={e => updateStep(i, 'label', e.target.value)}
                                            placeholder="Label"
                                            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                                        <button onClick={() => removeStep(i)} className="text-zinc-500 hover:text-red-400 transition">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowNew(false)} className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition">Cancel</button>
                        <button onClick={createCampaign} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl transition">
                            Create Campaign
                        </button>
                    </div>
                </div>
            )}

            {/* Campaign list */}
            {loading ? (
                <div className="flex justify-center py-10 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-14 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                    <Mail className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <h4 className="text-white font-semibold mb-2">No campaigns yet</h4>
                    <p className="text-zinc-400 text-sm mb-4">Create a drip campaign to automate your event emails</p>
                    <button onClick={() => setShowNew(true)} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition">
                        + Create First Campaign
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {campaigns.map(campaign => {
                        const event = events.find(e => e.id === campaign.eventId);
                        const isExpanded = expandedId === campaign.id;
                        return (
                            <div key={campaign.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="flex items-center justify-between p-4">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                    >
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="text-white font-medium text-sm line-clamp-1">{campaign.name}</p>
                                            <p className="text-zinc-500 text-xs">{event?.name || campaign.eventId} · {campaign.steps.length} steps</p>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2 ml-3 shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${campaign.isActive ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                                            {campaign.isActive ? 'Active' : 'Paused'}
                                        </span>
                                        <button onClick={() => toggleActive(campaign)} className="p-1.5 text-zinc-400 hover:text-white transition rounded-lg hover:bg-zinc-800">
                                            {campaign.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={() => deleteCampaign(campaign.id)} className="p-1.5 text-zinc-400 hover:text-red-400 transition rounded-lg hover:bg-zinc-800">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
                                        <div className="relative">
                                            {/* Timeline line */}
                                            <div className="absolute left-4 top-2 bottom-2 w-px bg-zinc-700" />
                                            <div className="space-y-3 pl-10">
                                                {campaign.steps.map((step, i) => {
                                                    return (
                                                        <div key={step.id || i} className="relative">
                                                            <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-600" />
                                                            <p className="text-white text-xs font-medium">{step.label}</p>
                                                            <p className="text-zinc-400 text-xs">
                                                                {step.triggerType === 'register' ? 'Immediately on registration'
                                                                    : step.triggerType === 'daysBeforeEvent' ? `${step.offsetDays} day${step.offsetDays !== 1 ? 's' : ''} before event`
                                                                        : `${step.offsetDays} day${step.offsetDays !== 1 ? 's' : ''} after event`}
                                                                {step.templateId && <span className="ml-2 text-zinc-500">· {(emailTemplates as any[]).find(t => t.id === step.templateId)?.name || step.templateId}</span>}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
