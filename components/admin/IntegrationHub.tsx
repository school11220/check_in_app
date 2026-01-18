'use client';

import { useState } from 'react';
import { Video, Globe, MessageSquare, CheckCircle, ExternalLink, Plus, Settings } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface Integration {
    id: string;
    name: string;
    provider: string;
    type: 'MEETING' | 'MESSAGING' | 'ANALYTICS';
    description: string;
    icon: any;
    connected: boolean;
}

export default function IntegrationHub() {
    const { showToast } = useToast();

    // Simplified state: Only Google Meet
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: 'meet',
            name: 'Google Meet',
            provider: 'google',
            type: 'MEETING',
            description: 'Integrated video conferencing for teams and participants.',
            icon: Globe,
            connected: true
        }
    ]);

    const [links, setLinks] = useState({
        organizer: '',
        participant: ''
    });

    const [showConfig, setShowConfig] = useState<string | null>(null);

    const toggleConnection = (id: string) => {
        const integration = integrations.find(i => i.id === id);
        if (!integration) return;

        const willConnect = !integration.connected;

        // Update state
        setIntegrations(prev => prev.map(int => {
            if (int.id === id) {
                return { ...int, connected: willConnect };
            }
            return int;
        }));

        // Side effect moved outside of state updater
        showToast(`${integration.name} ${willConnect ? 'connected' : 'disconnected'} successfully`, willConnect ? 'success' : 'info');

        if (willConnect) {
            setShowConfig(id);
        } else {
            setShowConfig(null);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold text-white">Integrations & Connected Apps</h2>
                <p className="text-zinc-400 text-sm">Manage external tools for virtual meetings.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((tool) => (
                    <div key={tool.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.connected ? 'bg-blue-900/30 text-blue-400' : 'bg-zinc-800/50 text-zinc-500'}`}>
                                <tool.icon className="w-6 h-6" />
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${tool.connected ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                {tool.connected ? 'Connected' : 'Not Connected'}
                            </div>
                        </div>

                        <h3 className="text-lg font-medium text-white mb-2">{tool.name}</h3>
                        <p className="text-sm text-zinc-400 mb-6 flex-1">{tool.description}</p>

                        <div className="flex gap-3 mt-auto">
                            {tool.connected ? (
                                <>
                                    <button
                                        onClick={() => setShowConfig(showConfig === tool.id ? null : tool.id)}
                                        className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Configure
                                    </button>
                                    <button
                                        onClick={() => toggleConnection(tool.id)}
                                        className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20"
                                        title="Disconnect"
                                    >
                                        X
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => toggleConnection(tool.id)}
                                    className="flex-1 px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
                                >
                                    Connect
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Custom Integration Placeholder */}
                <button className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors group h-full min-h-[200px]">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-colors">
                        <Plus className="w-5 h-5 text-zinc-400" />
                    </div>
                    <h3 className="text-white font-medium mb-1">Add Another Service</h3>
                    <p className="text-xs text-zinc-500">Connect via Webhook or API Key</p>
                </button>
            </div>

            {/* Configuration Panel - Only visible if Google Meet is connected */}
            {integrations.find(i => i.id === 'meet' && i.connected) && (
                <div className={`border-t border-zinc-800 pt-8 transition-all duration-300 ${showConfig === 'meet' ? 'opacity-100 translate-y-0' : 'opacity-100'}`}>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Google Meet Configurations
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Organizer Link */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <label className="block text-sm font-medium text-white mb-2">Organizer Meeting Room</label>
                            <p className="text-xs text-zinc-500 mb-4">Dedicated link for staff and speakers.</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={links.organizer}
                                    onChange={(e) => setLinks(prev => ({ ...prev, organizer: e.target.value }))}
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    className="flex-1 bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Participant Link */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <label className="block text-sm font-medium text-white mb-2">Participant Lounge</label>
                            <p className="text-xs text-zinc-500 mb-4">Main session link for general attendees.</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={links.participant}
                                    onChange={(e) => setLinks(prev => ({ ...prev, participant: e.target.value }))}
                                    placeholder="https://meet.google.com/xyz-uvwx-yz"
                                    className="flex-1 bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                                />
                                <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => showToast('Meeting links saved successfully', 'success')}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
