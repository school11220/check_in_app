'use client';

import { useApp } from '@/lib/store';

export default function ThemeRegistry() {
    const { siteSettings } = useApp();
    const theme = siteSettings?.theme;

    if (!theme) return null;

    return (
        <style jsx global>{`
            :root {
                --primary: ${theme.primaryColor || '#E11D2E'};
                --accent: ${siteSettings.accentColor || '#E11D2E'};
                --background: ${theme.backgroundColor || '#0B0B0B'};
            }
            .text-primary { color: var(--primary) !important; }
            .bg-primary { background-color: var(--primary) !important; }
            .border-primary { border-color: var(--primary) !important; }
            .shadow-primary { --tw-shadow-color: var(--primary); }
            
            /* Override specific Tailwind classes if needed, 
               but ideally usage should be var(--primary) in tailwind config.
               For now, we inject generic overrides for common red classes if desired,
               or rely on the fact that we might stick to standard colors.
               
               Actually, a better approach for strict red replacement is forcing it:
            */
            
            /* Dynamic Accent Color Application */
            [class*="text-red-500"], [class*="text-[#E11D2E]"] {
                color: var(--accent) !important;
            }
            [class*="bg-red-600"], [class*="bg-[#E11D2E]"] {
                background-color: var(--accent) !important;
            }
            [class*="border-red-500"], [class*="border-[#E11D2E]"] {
                border-color: var(--accent) !important;
            }
        `}</style>
    );
}
