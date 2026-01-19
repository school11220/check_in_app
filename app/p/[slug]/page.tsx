'use client';

import { useApp } from '@/lib/store';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CustomPage() {
    const { siteSettings } = useApp();
    const params = useParams();
    const slug = params.slug as string;

    const page = siteSettings.customPages.find(p => p.slug === slug && p.isPublished);

    if (!page) {
        return (
            <main className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">Page Not Found</h1>
                    <p className="text-zinc-400 mb-6">The page you're looking for doesn't exist or is not published.</p>
                    <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main
            className="min-h-screen py-12 px-4"
            style={{
                backgroundColor: siteSettings.theme?.backgroundColor || '#0B0B0B',
                color: siteSettings.theme?.textColor || '#FFFFFF'
            }}
        >
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-80 transition-opacity"
                    style={{ color: siteSettings.theme?.mutedTextColor || '#737373' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <article
                    className="prose prose-invert max-w-none"
                    style={{
                        fontFamily: siteSettings.theme?.bodyFont || 'Inter',
                    }}
                >
                    <h1
                        className="text-3xl md:text-4xl font-bold mb-6"
                        style={{
                            fontFamily: siteSettings.theme?.headerFont || 'Inter',
                            color: siteSettings.theme?.textColor || '#FFFFFF'
                        }}
                    >
                        {page.title}
                    </h1>
                    <div
                        dangerouslySetInnerHTML={{ __html: page.content }}
                        className="[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8
                                   [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6
                                   [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4
                                   [&_p]:mb-4 [&_p]:leading-relaxed
                                   [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                                   [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
                                   [&_li]:mb-2
                                   [&_a]:text-red-400 [&_a]:underline [&_a]:hover:text-red-300
                                   [&_blockquote]:border-l-4 [&_blockquote]:border-red-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4
                                   [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                                   [&_pre]:bg-zinc-900 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-auto [&_pre]:my-4"
                    />
                </article>
            </div>
        </main>
    );
}
