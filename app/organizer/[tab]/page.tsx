import { redirect } from 'next/navigation';
import OrganizerDashboard from '@/app/organizer/page';

const VALID_TABS = ['overview', 'events', 'schedule', 'attendees', 'sales', 'reviews'] as const;
type OrganizerTab = typeof VALID_TABS[number];

interface OrganizerTabRouteProps {
    params: Promise<{ tab: string }>;
}

export default async function OrganizerTabRoute({ params }: OrganizerTabRouteProps) {
    const { tab } = await params;
    if (!VALID_TABS.includes(tab as OrganizerTab)) {
        redirect('/organizer');
    }
    return <OrganizerDashboard defaultTab={tab as OrganizerTab} />;
}
