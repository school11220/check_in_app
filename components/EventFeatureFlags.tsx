'use client';

import { useEffect, useState } from 'react';
import {Settings as SettingsIcon, Loader2, Save} from '@/components/icons';
import { useToast } from '@/components/Toaster';
import { EVENT_FEATURE_KEYS, EVENT_FEATURE_LABELS, EventFeatureKey, getEventFeatures, DEFAULT_EVENT_FEATURES } from '@/lib/feature-flags';

interface Props {
    eventId: string;
    /** Optional initial features if you already have them. */
    initial?: unknown;
}

export default function EventFeatureFlags({ eventId, initial }: Props) {
    const { showToast } = useToast();
    const [features, setFeatures] = useState<Record<EventFeatureKey, boolean>>(
        () => getEventFeatures(initial)
    );
    const [loading, setLoading] = useState(!initial);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (initial) return;
        fetch(`/api/events/${eventId}/features`)
            .then((r) => r.json())
            .then((d) => setFeatures(getEventFeatures(d.features)))
            .catch(() => showToast('Failed to load feature flags', 'error'))
            .finally(() => setLoading(false));
    }, [eventId, initial, showToast]);

    const toggle = (k: EventFeatureKey) => {
        setFeatures((p) => ({ ...p, [k]: !p[k] }));
        setDirty(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/events/${eventId}/features`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features }),
            });
            if (!res.ok) throw new Error('save failed');
            showToast('Feature flags saved', 'success');
            setDirty(false);
        } catch {
            showToast('Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const reset = () => {
        setFeatures(DEFAULT_EVENT_FEATURES);
        setDirty(true);
    };

    if (loading) {
        return (
            <div className="text-center py-6 text-zinc-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4 text-red-500" /> Feature Flags
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={reset} className="text-xs text-zinc-400 hover:text-white">Reset</button>
                    <button
                        onClick={save}
                        disabled={!dirty || saving}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EVENT_FEATURE_KEYS.map((k) => {
                    const meta = EVENT_FEATURE_LABELS[k];
                    const on = features[k];
                    return (
                        <label
                            key={k}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${on ? 'bg-red-500/5 border-red-500/30' : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'}`}
                        >
                            <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggle(k)}
                                className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium">{meta.label}</p>
                                <p className="text-zinc-500 text-xs leading-snug">{meta.description}</p>
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
