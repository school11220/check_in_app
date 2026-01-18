'use client';

import { useState } from 'react';
import Link from 'next/link';

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    href?: string;
    onClick?: () => void;
    color?: string;
}

interface QuickActionsFABProps {
    actions: QuickAction[];
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function QuickActionsFAB({ actions, position = 'bottom-right' }: QuickActionsFABProps) {
    const [isOpen, setIsOpen] = useState(false);

    const positionStyles = {
        'bottom-right': 'right-4 bottom-4 items-end',
        'bottom-left': 'left-4 bottom-4 items-start',
        'bottom-center': 'left-1/2 -translate-x-1/2 bottom-4 items-center',
    };

    return (
        <div className={`fixed z-50 flex flex-col gap-3 safe-area-bottom ${positionStyles[position]}`}>
            {/* Action buttons */}
            <div
                className={`flex flex-col gap-2 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            >
                {actions.map((action, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 justify-end"
                        style={{
                            transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                            transform: isOpen ? 'scale(1)' : 'scale(0.8)',
                            opacity: isOpen ? 1 : 0,
                            transition: 'all 0.2s ease-out'
                        }}
                    >
                        <span className="text-sm text-white bg-black/80 px-3 py-1.5 rounded-lg backdrop-blur-sm whitespace-nowrap">
                            {action.label}
                        </span>
                        {action.href ? (
                            <Link
                                href={action.href}
                                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                style={{ backgroundColor: action.color || '#E11D2E' }}
                                onClick={() => setIsOpen(false)}
                            >
                                {action.icon}
                            </Link>
                        ) : (
                            <button
                                onClick={() => { action.onClick?.(); setIsOpen(false); }}
                                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                style={{ backgroundColor: action.color || '#E11D2E' }}
                            >
                                {action.icon}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Main FAB button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full bg-[#E11D2E] text-white flex items-center justify-center shadow-xl transition-all duration-300 hover:bg-[#C41E3A] ${isOpen ? 'rotate-45 bg-[#1F1F1F]' : ''}`}
                style={{ boxShadow: '0 4px 20px rgba(225, 29, 46, 0.4)' }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
}

// Pre-configured FAB for common admin actions
export function AdminQuickActions() {
    const actions: QuickAction[] = [
        {
            icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
            label: 'New Event',
            href: '/admin?tab=events&action=new',
            color: '#22C55E',
        },
        {
            icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
            label: 'Scanner',
            href: '/scan',
            color: '#3B82F6',
        },
        {
            icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
            label: 'Analytics',
            href: '/admin?tab=analytics',
            color: '#8B5CF6',
        },
    ];

    return <QuickActionsFAB actions={actions} />;
}

export default QuickActionsFAB;
