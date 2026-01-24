'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface PricingRule {
    id: string;
    eventId: string;
    triggerType: 'TIME_BASED' | 'DEMAND_BASED';
    triggerValue: number;
    adjustmentType: 'PERCENTAGE' | 'FIXED';
    adjustmentValue: number;
    active: boolean;
    event?: { name: string };
}

interface Event {
    id: string;
    name: string;
}

export default function PricingRules({ events }: { events: Event[] }) {
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        eventId: '',
        triggerType: 'DEMAND_BASED',
        triggerValue: 80,
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10,
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await fetch('/api/admin/pricing-rules');
            if (res.ok) {
                const data = await res.json();
                setRules(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/pricing-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                showToast('Rule created successfully', 'success');
                setShowModal(false);
                fetchRules();
            } else {
                showToast('Failed to create rule', 'error');
            }
        } catch (error) {
            showToast('Error creating rule', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`/api/admin/pricing-rules/${id}`, { method: 'DELETE' });
            showToast('Rule deleted', 'success');
            setRules(rules.filter(r => r.id !== id));
        } catch (error) {
            showToast('Error deleting rule', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="text-green-500" />
                    Dynamic Pricing Rules
                </h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 shadow-lg shadow-red-900/20 flex items-center gap-2 w-full md:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" /> Create Rule
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-zinc-500">Loading rules...</div>
            ) : rules.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                        <DollarSign className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400">No active pricing rules.</p>
                    <p className="text-zinc-600 text-sm mt-1">Create rules to automatically adjust ticket prices.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rules.map(rule => (
                        <div key={rule.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative group hover:border-red-500/50 transition-colors">
                            <button onClick={() => handleDelete(rule.id)} className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="badge bg-zinc-800 text-zinc-400 text-xs px-3 py-1 rounded-full w-fit mb-3 border border-zinc-700">
                                {rule.event && rule.event.name ? rule.event.name : 'Unknown Event'}
                            </div>

                            <div className="flex items-start gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${rule.adjustmentValue > 0 ? 'bg-green-900/20 border-green-900/50 text-green-500' : 'bg-red-900/20 border-red-900/50 text-red-500'}`}>
                                    {rule.adjustmentValue > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingUp className="w-5 h-5 rotate-180" />}
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">
                                        {rule.adjustmentValue > 0 ? '+' : ''}{rule.adjustmentValue}{rule.adjustmentType === 'PERCENTAGE' ? '%' : ' INR'}
                                    </p>
                                    <p className="text-zinc-500 text-xs">Price Adjustment</p>
                                </div>
                            </div>

                            <div className="border-t border-zinc-800 pt-4">
                                <p className="text-zinc-400 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                                    Trigger:
                                    <span className="text-white font-medium">
                                        {rule.triggerType === 'DEMAND_BASED'
                                            ? `When >${rule.triggerValue}% sold`
                                            : `When <${rule.triggerValue}h remaining`}
                                    </span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal - Standardized Style */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">Create Pricing Rule</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Select Event</label>
                                <select
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                    onChange={e => setFormData({ ...formData, eventId: e.target.value })}
                                    required
                                >
                                    <option value="">Select an event...</option>
                                    {events.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Trigger Type</label>
                                    <select
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                        value={formData.triggerType}
                                        onChange={e => setFormData({ ...formData, triggerType: e.target.value as any })}
                                    >
                                        <option value="DEMAND_BASED">Demand (% Sold)</option>
                                        <option value="TIME_BASED">Time (Hours Left)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Value ({formData.triggerType === 'DEMAND_BASED' ? '%' : 'Hours'})</label>
                                    <input
                                        type="number"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                        value={formData.triggerValue}
                                        onChange={e => setFormData({ ...formData, triggerValue: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Adjustment Type</label>
                                    <select
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                        value={formData.adjustmentType}
                                        onChange={e => setFormData({ ...formData, adjustmentType: e.target.value as any })}
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Value ({formData.adjustmentType === 'PERCENTAGE' ? '%' : '₹'})</label>
                                    <input
                                        type="number"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                        value={formData.adjustmentValue}
                                        onChange={e => setFormData({ ...formData, adjustmentValue: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 border border-zinc-700">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700">Create Rule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
