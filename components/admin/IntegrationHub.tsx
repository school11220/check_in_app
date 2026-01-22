'use client';

import { useState, useEffect } from 'react';
import { Video, Globe, MessageSquare, CheckCircle, ExternalLink, Plus, Settings, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface Integration {
    id: string;
    name: string;
    provider: string;
    type: 'MEETING' | 'MESSAGING' | 'ANALYTICS' | 'PAYMENT';
    description?: string;
    isEnabled: boolean;
    config: Record<string, string>;
}

export default function IntegrationHub() {
    const { showToast } = useToast();
    // Initialize with default known integrations
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: 'razorpay',
            name: 'Razorpay',
            provider: 'razorpay',
            type: 'PAYMENT',
            description: 'Accept payments via Credit/Debit cards, UPI, and Netbanking.',
            isEnabled: false,
            config: { key_id: '', key_secret: '' }
        }
    ]);
    const [loading, setLoading] = useState(true);
    const [showConfig, setShowConfig] = useState<string | null>(null);
    const [configForm, setConfigForm] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        try {
            const res = await fetch('/api/admin/integrations');
            if (res.ok) {
                const data = await res.json();

                setIntegrations(prev => prev.map(defaultInt => {
                    const found = data.find((d: Integration) => d.provider === defaultInt.provider);
                    if (found) {
                        return { ...defaultInt, ...found };
                    }
                    return defaultInt;
                }));

                // If there are other dynamic integrations from DB not in default, could add them here
                // data.forEach(...) 
            }
        } catch (error) {
            console.error('Failed to fetch integrations', error);
            showToast('Failed to load integration status', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (integration: Integration) => {
        try {
            const res = await fetch('/api/admin/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: integration.provider,
                    name: integration.name,
                    type: integration.type,
                    isEnabled: integration.isEnabled,
                    config: configForm
                })
            });

            if (res.ok) {
                showToast('Configuration saved successfully', 'success');
                fetchIntegrations(); // Reload to get updated state (and masked keys)
                setShowConfig(null);
            } else {
                showToast('Failed to save configuration', 'error');
            }
        } catch (error) {
            console.error('Save failed', error);
            showToast('Failed to save configuration', 'error');
        }
    };

    const toggleIntegration = async (integration: Integration) => {
        try {
            // Optimistic update
            const newState = !integration.isEnabled;
            setIntegrations(prev => prev.map(i => i.provider === integration.provider ? { ...i, isEnabled: newState } : i));

            const res = await fetch('/api/admin/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: integration.provider,
                    name: integration.name,
                    type: integration.type,
                    isEnabled: newState,
                    config: integration.config // Keep existing config
                })
            });

            if (res.ok) {
                showToast(`${integration.name} ${newState ? 'enabled' : 'disabled'}`, 'success');
            } else {
                // Revert on failure
                setIntegrations(prev => prev.map(i => i.provider === integration.provider ? { ...i, isEnabled: !newState } : i));
                showToast('Failed to update status', 'error');
            }
        } catch (error) {
            setIntegrations(prev => prev.map(i => i.provider === integration.provider ? { ...i, isEnabled: !integration.isEnabled } : i));
            showToast('Failed to update status', 'error');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'PAYMENT': return CreditCard;
            case 'MEETING': return Video;
            case 'MESSAGING': return MessageSquare;
            default: return Globe;
        }
    };

    if (loading) {
        return <div className="text-center py-10 text-zinc-500">Loading integrations...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold text-white">Integrations & Connected Apps</h2>
                <p className="text-zinc-400 text-sm">Manage external tools and payment gateways.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((tool) => {
                    const Icon = getIcon(tool.type);
                    return (
                        <div key={tool.provider} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.isEnabled ? 'bg-blue-900/30 text-blue-400' : 'bg-zinc-800/50 text-zinc-500'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${tool.isEnabled ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                    {tool.isEnabled ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            <h3 className="text-lg font-medium text-white mb-2">{tool.name}</h3>
                            <p className="text-sm text-zinc-400 mb-6 flex-1">{tool.description || `Integrate with ${tool.name}`}</p>

                            <div className="flex gap-3 mt-auto">
                                <button
                                    onClick={() => {
                                        if (showConfig === tool.provider) {
                                            setShowConfig(null);
                                        } else {
                                            setConfigForm(tool.config || {});
                                            setShowConfig(tool.provider);
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Settings className="w-4 h-4" />
                                    Configure
                                </button>
                                <button
                                    onClick={() => toggleIntegration(tool)}
                                    className={`px-3 py-2 rounded-xl hover:opacity-80 transition-opacity ${tool.isEnabled ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}
                                    title={tool.isEnabled ? "Disable" : "Enable"}
                                >
                                    {tool.isEnabled ? 'Off' : 'On'}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Custom Integration Placeholder */}
                <button className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors group h-full min-h-[200px]">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-colors">
                        <Plus className="w-5 h-5 text-zinc-400" />
                    </div>
                    <h3 className="text-white font-medium mb-1">Add Another Service</h3>
                    <p className="text-xs text-zinc-500">Connect via Webhook or API Key</p>
                </button>
            </div>

            {/* Configuration Panel */}
            {showConfig && (
                <div className="border-t border-zinc-800 pt-8 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-zinc-400" />
                            Configuration: {integrations.find(i => i.provider === showConfig)?.name}
                        </h3>
                        <button
                            onClick={() => setShowConfig(null)}
                            className="text-zinc-500 hover:text-white"
                        >
                            Close
                        </button>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl">
                        {showConfig === 'razorpay' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Key ID</label>
                                    <input
                                        type="text"
                                        value={configForm.key_id || ''}
                                        onChange={(e) => setConfigForm(prev => ({ ...prev, key_id: e.target.value }))}
                                        placeholder="rzp_test_..."
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Key Secret</label>
                                    <input
                                        type="password"
                                        value={configForm.key_secret || ''}
                                        onChange={(e) => setConfigForm(prev => ({ ...prev, key_secret: e.target.value }))}
                                        placeholder="Enter key secret"
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">First few characters will be visible after saving.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-zinc-500 text-sm">
                                Generic configuration editor coming soon.
                                <pre className="mt-2 bg-zinc-950 p-2 rounded text-xs">{JSON.stringify(configForm, null, 2)}</pre>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfig(null)}
                                className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const integration = integrations.find(i => i.provider === showConfig);
                                    if (integration) handleSave(integration);
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
