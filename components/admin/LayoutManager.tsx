'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { Layout, Eye, EyeOff, Save, RotateCcw } from 'lucide-react';

export default function LayoutManager() {
    const { siteSettings, updateSiteSettings, showToast } = useApp();
    const [settings, setSettings] = useState({
        heroTitle: '',
        heroSubtitle: '',
        showHero: true,
        showFeatures: true,
        showSchedule: true,
        showSponsors: true,
        showFaq: true,
    });
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize state from global store
    useEffect(() => {
        setSettings({
            heroTitle: siteSettings.heroTitle || 'EventHub 2024',
            heroSubtitle: siteSettings.heroSubtitle || 'The ultimate event management platform for organizers and attendees.',
            showHero: siteSettings.showHero ?? true,
            showFeatures: siteSettings.showFeatures ?? true,
            showSchedule: siteSettings.showSchedule ?? true,
            showSponsors: siteSettings.showSponsors ?? true,
            showFaq: siteSettings.showFaq ?? true,
        });
    }, [siteSettings]);

    const handleChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateSiteSettings(settings);
        setHasChanges(false); // Reset local changes flag
        showToast?.('Layout settings saved successfully!', 'success');
    };

    const handleReset = () => {
        if (confirm('Discard unsaved changes?')) {
            setSettings({
                heroTitle: siteSettings.heroTitle || 'EventHub 2024',
                heroSubtitle: siteSettings.heroSubtitle || 'The ultimate event management platform for organizers and attendees.',
                showHero: siteSettings.showHero ?? true,
                showFeatures: siteSettings.showFeatures ?? true,
                showSchedule: siteSettings.showSchedule ?? true,
                showSponsors: siteSettings.showSponsors ?? true,
                showFaq: siteSettings.showFaq ?? true,
            });
            setHasChanges(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Home Page Layout</h2>
                    <p className="text-sm text-[#737373]">Customize the appearance and visibility of sections on the main landing page.</p>
                </div>
                {hasChanges && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-[#1F1F1F] text-[#737373] hover:text-white rounded-xl transition-colors flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-[#E11D2E] text-white rounded-xl hover:bg-[#C41E3A] transition-colors flex items-center gap-2 shadow-lg shadow-red-900/20"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hero Section Settings */}
                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#E11D2E]/10 rounded-lg">
                                <Layout className="w-5 h-5 text-[#E11D2E]" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Hero Section</h3>
                        </div>
                        <button
                            onClick={() => handleChange('showHero', !settings.showHero)}
                            className={`p-2 rounded-lg transition-colors ${settings.showHero ? 'bg-[#E11D2E]/10 text-[#E11D2E]' : 'bg-[#1F1F1F] text-[#737373]'}`}
                            title={settings.showHero ? 'Hide Section' : 'Show Section'}
                        >
                            {settings.showHero ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className={`space-y-4 transition-opacity ${settings.showHero ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div>
                            <label className="block text-sm text-[#B3B3B3] mb-2">Main Title</label>
                            <input
                                type="text"
                                value={settings.heroTitle}
                                onChange={(e) => handleChange('heroTitle', e.target.value)}
                                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none"
                                placeholder="Event Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[#B3B3B3] mb-2">Subtitle</label>
                            <textarea
                                value={settings.heroSubtitle}
                                onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white focus:border-[#E11D2E]/50 focus:outline-none resize-none"
                                placeholder="Event tagline or description..."
                            />
                        </div>
                    </div>
                </div>

                {/* Section Visibility Controls */}
                <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Section Visibility</h3>
                    <div className="space-y-4">
                        {[
                            { key: 'showFeatures', label: 'Features Grid', desc: 'Display core features and value props.' },
                            { key: 'showSchedule', label: 'Event Schedule', desc: 'Show the timeline of sessions.' },
                            { key: 'showSponsors', label: 'Sponsors & Partners', desc: 'Display sponsor logos grid.' },
                            { key: 'showFaq', label: 'FAQ Section', desc: 'Frequently asked questions accordion.' },
                        ].map((section) => (
                            <div key={section.key} className="flex items-center justify-between p-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl">
                                <div>
                                    <h4 className="text-white font-medium">{section.label}</h4>
                                    <p className="text-xs text-[#737373]">{section.desc}</p>
                                </div>
                                <button
                                    onClick={() => handleChange(section.key, !settings[section.key as keyof typeof settings])}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[section.key as keyof typeof settings] ? 'bg-[#E11D2E]' : 'bg-[#2A2A2A]'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings[section.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview Banner */}
            <div className="p-4 bg-gradient-to-r from-[#E11D2E]/10 to-transparent border border-[#E11D2E]/20 rounded-xl flex items-start gap-4">
                <div className="p-2 bg-[#E11D2E] rounded-lg mt-1">
                    <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h4 className="text-white font-medium mb-1">Live Preview Available</h4>
                    <p className="text-sm text-[#B3B3B3]">
                        Changes are saved to the site configuration immediately when you click Save.
                        Visit the <a href="/" target="_blank" className="text-[#E11D2E] hover:underline">home page</a> to see your changes live.
                    </p>
                </div>
            </div>
        </div>
    );
}
