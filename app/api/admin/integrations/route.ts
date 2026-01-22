import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Helper to check admin auth
async function checkAuth() {
    const session = await getSession();
    return !!session;
}

export async function GET() {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const integrations = await prisma.integration.findMany();

        // Mask secret keys before sending to client
        const safeIntegrations = integrations.map(int => {
            const config = int.config as Record<string, string>;
            const safeConfig = { ...config };

            // Mask common secret key patterns
            Object.keys(safeConfig).forEach(key => {
                if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key')) {
                    // Only show first 4 characters
                    if (safeConfig[key] && safeConfig[key].length > 8) {
                        safeConfig[key] = `${safeConfig[key].substring(0, 4)}...${safeConfig[key].substring(safeConfig[key].length - 4)}`;
                    } else {
                        safeConfig[key] = '********';
                    }
                }
            });

            return {
                ...int,
                config: safeConfig,
            };
        });

        return NextResponse.json(safeIntegrations);
    } catch (error) {
        console.error('Failed to fetch integrations:', error);
        return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { provider, name, type, isEnabled, config } = body;

        // If updating config (creating/updating), request will contain the full/new keys
        // We need to merge with existing if the user sent masked keys back

        let finalConfig = config;

        // Fetch existing to compare keys
        const existing = await prisma.integration.findUnique({
            where: { provider }
        });

        if (existing) {
            const existingConfig = existing.config as Record<string, string>;

            // Restore original keys if user ignored them or sent back masked version
            Object.keys(finalConfig).forEach(key => {
                const val = finalConfig[key];
                if (val === '********' || (val.includes('...') && val.length < 20)) {
                    // User didn't change this key, keep original
                    if (existingConfig[key]) {
                        finalConfig[key] = existingConfig[key];
                    }
                }
            });
        }

        const integration = await prisma.integration.upsert({
            where: { provider },
            create: {
                provider,
                name,
                type,
                isEnabled: isEnabled ?? false,
                config: finalConfig
            },
            update: {
                isEnabled: isEnabled,
                config: finalConfig,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(integration);
    } catch (error) {
        console.error('Failed to update integration:', error);
        return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
    }
}
