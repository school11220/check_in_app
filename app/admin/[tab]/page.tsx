import { redirect } from 'next/navigation';
import AdminPage from '@/app/admin/page';
import { AdminTabId } from '@/components/admin/AdminShell';

const VALID_TABS: AdminTabId[] = [
    'events', 'attendees', 'analytics', 'reviews', 'sessions',
    'team', 'festivals', 'emails', 'surveys', 'tickets',
    'layout', 'growth', 'certificates', 'audit', 'history',
    'sales', 'pages', 'automation',
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
