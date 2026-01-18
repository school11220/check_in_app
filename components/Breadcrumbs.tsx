'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    showHome?: boolean;
    separator?: 'chevron' | 'slash' | 'arrow';
}

export function Breadcrumbs({ items, showHome = true, separator = 'chevron' }: BreadcrumbsProps) {
    const pathname = usePathname();

    // Auto-generate breadcrumbs from path if no items provided
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        if (items) return items;

        const paths = pathname.split('/').filter(Boolean);
        const crumbs: BreadcrumbItem[] = [];

        let href = '';
        for (const path of paths) {
            href += `/${path}`;
            crumbs.push({
                label: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
                href: href,
            });
        }

        // Remove href from last item (current page)
        if (crumbs.length > 0) {
            delete crumbs[crumbs.length - 1].href;
        }

        return crumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    const separators = {
        chevron: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        ),
        slash: <span>/</span>,
        arrow: <span>→</span>,
    };

    if (breadcrumbs.length === 0 && !showHome) return null;

    return (
        <nav className="flex items-center gap-2 text-sm text-[#737373] mb-4" aria-label="Breadcrumb">
            {showHome && (
                <>
                    <Link
                        href="/"
                        className="hover:text-white transition-colors flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    {breadcrumbs.length > 0 && (
                        <span className="text-[#404040]">{separators[separator]}</span>
                    )}
                </>
            )}

            {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center gap-2">
                    {crumb.href ? (
                        <Link
                            href={crumb.href}
                            className="hover:text-white transition-colors"
                        >
                            {crumb.label}
                        </Link>
                    ) : (
                        <span className="text-white font-medium">{crumb.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && (
                        <span className="text-[#404040]">{separators[separator]}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}

export default Breadcrumbs;
