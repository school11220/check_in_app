'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, BarChart3, ArrowRight, X, Sparkles } from 'lucide-react';

interface Props {
    hasEvents: boolean;
    onDismiss?: () => void;
}

const STEPS = [
    {
        icon: Calendar,
        title: 'Create your first event',
        body: 'Set the name, date, venue, and ticket price. You can always edit it later.',
        cta: { label: 'Create event', href: '/organizer?tab=events' },
    },
    {
        icon: Users,
        title: 'Invite your team',
        body: 'Add scanners and co-organizers. They only see the events you assign.',
        cta: { label: 'Manage team', href: '/admin?tab=team' },
    },
    {
        icon: BarChart3,
        title: 'Watch attendance live',
        body: 'Open the check-in scanner on the day. We sync offline scans automatically.',
        cta: { label: 'Open check-in', href: '/checkin' },
    },
] as const;

/**
 * 3-step onboarding card shown to new organizers with no events yet.
 * Persists a dismiss in localStorage so it doesn't reappear.
 */
export default function OnboardingWizard({ hasEvents, onDismiss }: Props) {
    const [dismissed, setDismissed] = useState(false);

    if (hasEvents || dismissed) return null;

    const handleDismiss = () => {
        try {
            localStorage.setItem('eventhub:onboarding-dismissed', '1');
        } catch {
            /* SSR / private mode */
        }
        setDismissed(true);
        onDismiss?.();
    };

    return (
        <section
            className="relative bg-gradient-to-br from-[#E11D2E]/10 via-[#141414] to-[#141414] border border-[#E11D2E]/30 rounded-2xl p-6 sm:p-8 overflow-hidden"
            aria-label="Onboarding"
        >
            <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Dismiss onboarding"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#E11D2E]" />
                <h2 className="text-lg font-semibold text-white">Welcome to EventHub</h2>
            </div>
            <p className="text-zinc-400 text-sm mb-6 max-w-2xl">
                Three quick steps to launch your first event. You can skip this anytime.
            </p>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                        <li
                            key={step.title}
                            className="relative bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-5 flex flex-col"
                        >
                            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[#E11D2E] text-white text-sm font-bold flex items-center justify-center shadow-lg">
                                {idx + 1}
                            </div>
                            <Icon className="w-6 h-6 text-[#E11D2E] mb-3" aria-hidden="true" />
                            <h3 className="text-white font-medium mb-1">{step.title}</h3>
                            <p className="text-zinc-400 text-sm flex-1 mb-4">{step.body}</p>
                            <Link
                                href={step.cta.href}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#E11D2E] hover:text-white transition-colors"
                            >
                                {step.cta.label}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
