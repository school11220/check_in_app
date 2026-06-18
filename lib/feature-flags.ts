/**
 * Per-event feature flags. Each flag gates a chunk of UI for a single event,
 * so organizers can opt into only the features they need.
 *
 * Defaults are conservative; organizers can flip them on per event.
 */
export const EVENT_FEATURE_KEYS = [
    'photoWall',
    'polls',
    'certificates',
    'dripCampaigns',
    'surveys',
    'waitlist',
    'reviews',
    'calendar',
    'socialSharing',
    'chat',
] as const;

export type EventFeatureKey = (typeof EVENT_FEATURE_KEYS)[number];

export const EVENT_FEATURE_LABELS: Record<EventFeatureKey, { label: string; description: string }> = {
    photoWall: { label: 'Photo Wall', description: 'Let attendees upload and view event photos.' },
    polls: { label: 'Live Polls & Q&A', description: 'Engage the audience with polls and live questions.' },
    certificates: { label: 'Certificates', description: 'Generate downloadable certificates of attendance.' },
    dripCampaigns: { label: 'Drip Campaigns', description: 'Run automated email sequences for this event.' },
    surveys: { label: 'Post-event Surveys', description: 'Collect feedback after the event ends.' },
    waitlist: { label: 'Waitlist', description: 'Let attendees join a waitlist when sold out.' },
    reviews: { label: 'Reviews', description: 'Show public reviews on the event page.' },
    calendar: { label: 'Add to Calendar', description: 'Offer .ics / Google / Outlook calendar downloads.' },
    socialSharing: { label: 'Social Sharing', description: 'Show share buttons and a custom OG image.' },
    chat: { label: 'Live Chat', description: 'Real-time chat between attendees. Off by default.' },
};

export const DEFAULT_EVENT_FEATURES: Record<EventFeatureKey, boolean> = {
    photoWall: true,
    polls: true,
    certificates: false,
    dripCampaigns: true,
    surveys: true,
    waitlist: true,
    reviews: true,
    calendar: true,
    socialSharing: true,
    chat: false,
};

export function getEventFeatures(raw: unknown): Record<EventFeatureKey, boolean> {
    const out = { ...DEFAULT_EVENT_FEATURES };
    if (raw && typeof raw === 'object') {
        for (const k of EVENT_FEATURE_KEYS) {
            const v = (raw as Record<string, unknown>)[k];
            if (typeof v === 'boolean') out[k] = v;
        }
    }
    return out;
}

export function isEventFeatureOn(raw: unknown, key: EventFeatureKey): boolean {
    return getEventFeatures(raw)[key];
}
