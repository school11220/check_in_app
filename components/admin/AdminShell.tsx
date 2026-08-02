'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { OrganizationSwitcher, useAuth, useUser } from '@clerk/nextjs';
import { resolveRole } from '@/lib/clerk-role-utils';
import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import {LogOut, Home, Users, Calendar, BarChart3, MessageSquare, Tent, Mail, ClipboardList, Layout, TrendingUp, Award, Clock, History, Ticket, Power, FileText, Settings as SettingsIcon} from '@/components/icons';
export type AdminTabId =
    | 'events' | 'attendees' | 'analytics' | 'reviews' | 'sessions'
    | 'team' | 'festivals' | 'emails' | 'surveys' | 'tickets'
    | 'layout' | 'growth' | 'certificates' | 'audit' | 'history'
    | 'sales' | 'pages';

interface TabConfig {
    id: AdminTabId;
    label: string;
    icon: any;
    roles: string[];
}

const TABS: TabConfig[] = [
    { id: 'events', label: 'Events', icon: Calendar, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'attendees', label: 'Attendees', icon: Users, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'sessions', label: 'Sessions', icon: Clock, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'team', label: 'Team', icon: SettingsIcon, roles: ['ADMIN'] },
    { id: 'festivals', label: 'Festivals', icon: Tent, roles: ['ADMIN'] },
    { id: 'emails', label: 'Emails', icon: Mail, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'surveys', label: 'Surveys', icon: ClipboardList, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'tickets', label: 'Ticket Design', icon: Ticket, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'layout', label: 'Layout', icon: Layout, roles: ['ADMIN'] },
    { id: 'growth', label: 'Pricing', icon: TrendingUp, roles: ['ADMIN'] },
    { id: 'certificates', label: 'Certificates', icon: Award, roles: ['ADMIN'] },
    { id: 'audit', label: 'Logs', icon: History, roles: ['ADMIN'] },
    { id: 'history', label: 'History', icon: History, roles: ['ADMIN', 'ORGANIZER'] },
    { id: 'sales', label: 'Sales Control', icon: Power, roles: ['ADMIN'] },
    { id: 'pages', label: 'Pages', icon: FileText, roles: ['ADMIN'] },
];

interface AdminShellProps {
    initialTab?: AdminTabId;
    title?: string;
    children: (activeTab: AdminTabId) => ReactNode;
}

/**
 * Shared admin shell. Renders the top bar, role-aware tab nav, and exposes
 * the active tab id to the children render function.
 *
 * Tabs are read from `?tab=` and pushed back so the URL is the source of
 * truth — this lets each tab be a deep-linkable per-tab route.
 */
export default function AdminShell({ initialTab = 'events', title, children }: AdminShellProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const { orgRole } = useAuth();
    const { signOut } = useClerk();

    const role = resolveRole(orgRole, user?.publicMetadata?.role);
    const visibleTabs = TABS.filter(t => t.roles.includes(role));
    const tabFromUrl = (searchParams.get('tab') as AdminTabId) || initialTab;
    const [activeTab, setActiveTab] = useState<AdminTabId>(tabFromUrl);

    useEffect(() => {
        const next = (searchParams.get('tab') as AdminTabId) || initialTab;
        if (next && next !== activeTab && visibleTabs.some(t => t.id === next)) {
            queueMicrotask(() => setActiveTab(next));
        }
    }, [searchParams, initialTab, activeTab, visibleTabs]);

    const switchTab = (id: AdminTabId) => {
        setActiveTab(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', id);
        // If we're on /admin root, push state. If on /admin/[tab], use router.replace.
        if (pathname?.startsWith('/admin/') && pathname !== '/admin') {
            router.replace(`/admin/${id}?${params.toString()}`);
        } else {
            router.replace(`/admin?${params.toString()}`);
        }
    };

    const handleLogout = async () => {
        await signOut({ redirectUrl: '/login' });
    };

    return (
        <div className="min-h-screen bg-[#171e19] text-white">
            <header className="sticky top-0 z-30 bg-[#ffe17c] text-black border-b-2 border-black">
                <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Link href="/" className="font-bold flex items-center gap-2 text-sm hover:underline">
                        <Image src="/logo.png" alt="EventHub" width={28} height={28} className="h-7 w-7 object-contain border-2 border-black bg-black" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base sm:text-lg font-extrabold truncate uppercase tracking-tight">
                            {title || 'Admin Console'}
                        </h1>
                    </div>
                    <OrganizationSwitcher hidePersonal={false} afterCreateOrganizationUrl="/admin" afterLeaveOrganizationUrl="/" />
                    <button
                        onClick={handleLogout}
                        className="px-3 py-1.5 text-sm bg-black text-white border-2 border-black rounded-lg flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>
                <nav className="max-w-screen-2xl mx-auto px-2 overflow-x-auto">
                    <ul className="flex gap-1 min-w-max">
                        {visibleTabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <li key={tab.id}>
                                    <button
                                        onClick={() => switchTab(tab.id)}
                                        className={`px-3 py-2 text-sm font-bold rounded-t-lg flex items-center gap-2 whitespace-nowrap transition-colors border-2 border-b-0 border-black ${
                                            isActive
                                                ? 'bg-[#171e19] text-white'
                                                : 'text-black hover:bg-white'
                                        }`}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </header>

            <main className="max-w-screen-2xl mx-auto px-4 py-6">
                {children(activeTab)}
            </main>
        </div>
    );
}
