import { redirect } from 'next/navigation';
import AdminPage from '@/app/admin/page';

type AdminTabId =
    | 'events' | 'attendees' | 'analytics' | 'reviews' | 'sessions'
    | 'segments' | 'reminders' | 'templates'
    | 'team' | 'festivals' | 'tickets' | 'layout' | 'growth'
    | 'certificates' | 'audit' | 'history' | 'sales' | 'pages';

const VALID_TABS: AdminTabId[] = [
    'events', 'attendees', 'analytics', 'reviews', 'sessions',
    'segments', 'reminders', 'templates',
    'team', 'festivals', 'tickets',
    'layout', 'growth', 'certificates', 'audit', 'history',
    'sales', 'pages',
];

interface AdminTabRouteProps {
    params: Promise<{ tab: string }>;
}

export default async function AdminTabRoute({ params }: AdminTabRouteProps) {
    const { tab } = await params;
    if (!VALID_TABS.includes(tab as AdminTabId)) {
        redirect('/admin');
    }
    return <AdminPage defaultTab={tab as AdminTabId} />;
}
