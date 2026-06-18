import { redirect } from 'next/navigation';
import CheckinPage from '@/app/checkin/page';

const VALID_TABS = ['scanner', 'history', 'guestlist', 'stats'] as const;
type CheckinTab = typeof VALID_TABS[number];

interface CheckinTabRouteProps {
    params: Promise<{ tab: string }>;
    searchParams: Promise<{ event?: string }>;
}

export default async function CheckinTabRoute({ params, searchParams }: CheckinTabRouteProps) {
    const { tab } = await params;
    if (!VALID_TABS.includes(tab as CheckinTab)) {
        redirect('/checkin');
    }
    const sp = await searchParams;
    return <CheckinPage defaultTab={tab as CheckinTab} defaultEventId={sp.event} />;
}
