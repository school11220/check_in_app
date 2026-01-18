'use client';

import { useState } from 'react';

interface AnnouncementBarProps {
    message: string;
    linkText?: string;
    linkHref?: string;
    variant?: 'default' | 'promo' | 'warning' | 'info';
    dismissible?: boolean;
    onDismiss?: () => void;
}

export function AnnouncementBar({
    message,
    linkText,
    linkHref,
    variant = 'default',
    dismissible = true,
    onDismiss
}: AnnouncementBarProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const variantStyles = {
        default: 'bg-gradient-to-r from-[#E11D2E] via-[#C41E3A] to-[#B91C1C] text-white',
        promo: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white',
        warning: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black',
        info: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
    };

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss?.();
    };

    return (
        <div className={`${variantStyles[variant]} py-2.5 px-4 text-center text-sm font-medium relative`}>
            <div className="container mx-auto flex items-center justify-center gap-2">
                <span className="animate-pulse">✨</span>
                <span>{message}</span>
                {linkText && linkHref && (
                    <a
                        href={linkHref}
                        className="underline underline-offset-2 hover:no-underline font-semibold ml-1"
                    >
                        {linkText} →
                    </a>
                )}
            </div>
            {dismissible && (
                <button
                    onClick={handleDismiss}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default AnnouncementBar;
