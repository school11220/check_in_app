import { redirect } from 'next/navigation';
import OrganizerDashboard from '@/app/organizer/page';

const VALID_TABS = ['overview', 'events', 'schedule', 'attendees', 'segments', 'reminders', 'templates', 'reviews'] as const;
type OrganizerTab = typeof VALID_TABS[number];

interface OrganizerTabRouteProps {
    params: Promise<{ tab: string }>;
    searchParams: Promise<{ event?: string }>;
}

export default async function OrganizerTabRoute({ params, searchParams }: OrganizerTabRouteProps) {
    const { tab } = await params;
    const { event } = await searchParams;
    if (!VALID_TABS.includes(tab as OrganizerTab)) {
        redirect('/organizer');
    }
    return <OrganizerDashboard defaultTab={tab as OrganizerTab} defaultEventId={event} />;
}
