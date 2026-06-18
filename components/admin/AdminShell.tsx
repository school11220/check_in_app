'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import {LogOut, Home, Users, Calendar, BarChart3, MessageSquare, Tent, Mail, ClipboardList, Layout, TrendingUp, Award, Clock, History, Ticket, Power, FileText, Settings as SettingsIcon} from '@/components/icons';
export type AdminTabId =
    | 'events' | 'attendees' | 'analytics' | 'reviews' | 'sessions'
    | 'team' | 'festivals' | 'emails' | 'surveys' | 'tickets'
    | 'layout' | 'growth' | 'certificates' | 'audit' | 'history'
    | 'sales' | 'pages' | 'automation';

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
    { id: 'automation', label: 'Automation', icon: Mail, roles: ['ADMIN'] },
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
    const { signOut } = useClerk();

    const role = (user?.publicMetadata?.role as string) || 'UNAUTHORIZED';
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
        <div className="min-h-screen bg-[#0B0B0B] text-white">
            <header className="sticky top-0 z-30 bg-[#0B0B0B]/90 backdrop-blur border-b border-[#1F1F1F]">
                <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Link href="/" className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm">
                        <Home className="w-4 h-4" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base sm:text-lg font-semibold truncate">
                            {title || 'Admin Console'}
                        </h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 flex items-center gap-2"
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
                                        className={`px-3 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                                            isActive
                                                ? 'bg-[#141414] text-white border-b-2 border-red-500'
                                                : 'text-zinc-400 hover:text-white hover:bg-[#141414]/50'
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
