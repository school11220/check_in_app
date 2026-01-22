import { prisma } from '@/lib/prisma';
import SurveyForm from '@/components/SurveyForm';
import { notFound } from 'next/navigation';

export default async function SurveyPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const config = await prisma.siteConfig.findUnique({
        where: { id: 'default' }
    });

    if (!config) return notFound();

    const surveys = (config.surveys as any[]) || [];
    const siteSettings = (config.settings as any) || {};

    const survey = surveys.find((s: any) => s.id === id);

    if (!survey || !survey.isActive) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-3xl font-bold text-white mb-4">Survey Not Found</h1>
                <p className="text-zinc-500">The survey you are looking for has been removed or is no longer active.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-red-500/30 selection:text-red-200"
            style={{
                fontFamily: siteSettings.theme?.bodyFont || 'Inter, sans-serif',
                // Use background from theme if available, or fallback
                backgroundColor: siteSettings.theme?.backgroundColor || '#000000'
            }}>
            <SurveyForm survey={survey} siteName={siteSettings.siteName || 'EventHub'} />
        </div>
    );
}
