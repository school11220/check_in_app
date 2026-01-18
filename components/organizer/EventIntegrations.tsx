'use client';

import { useState } from 'react';
import { Globe, ExternalLink, Save } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface EventIntegrationsProps {
    eventId: string;
    initialVideoLink?: string | null;
    initialOrganizerLink?: string | null;
    onClose: () => void;
}

export default function EventIntegrations({
    eventId,
    initialVideoLink,
    initialOrganizerLink,
    onClose
}: EventIntegrationsProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [links, setLinks] = useState({
        videoLink: initialVideoLink || '',
        organizerVideoLink: initialOrganizerLink || ''
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoLink: links.videoLink,
                    organizerVideoLink: links.organizerVideoLink
                })
            });

            if (res.ok) {
                showToast('Meeting links updated successfully', 'success');
                onClose();
            } else {
                showToast('Failed to update links', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error saving changes', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-900/30 flex items-center justify-center text-blue-400">
                        <Globe className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Google Meet Integration</h3>
                        <p className="text-zinc-400 text-sm">Configure virtual meeting rooms for this event.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Organizer Link */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-5">
                        <label className="block text-sm font-medium text-white mb-2">Organizer Meeting Room</label>
                        <p className="text-xs text-zinc-500 mb-4">Dedicated link for staff and speakers.</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={links.organizerVideoLink}
                                onChange={(e) => setLinks(prev => ({ ...prev, organizerVideoLink: e.target.value }))}
                                placeholder="https://meet.google.com/..."
                                className="flex-1 bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-zinc-600"
                            />
                            {links.organizerVideoLink && (
                                <a
                                    href={links.organizerVideoLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Participant Link */}
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-5">
                        <label className="block text-sm font-medium text-white mb-2">Participant Lounge</label>
                        <p className="text-xs text-zinc-500 mb-4">Main session link for general attendees.</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={links.videoLink}
                                onChange={(e) => setLinks(prev => ({ ...prev, videoLink: e.target.value }))}
                                placeholder="https://meet.google.com/..."
                                className="flex-1 bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none placeholder:text-zinc-600"
                            />
                            {links.videoLink && (
                                <a
                                    href={links.videoLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
