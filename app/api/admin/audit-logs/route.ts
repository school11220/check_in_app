import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { respond } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

function csvField(value: unknown): string {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export const GET = respond(
    async (req: NextRequest) => {
        const url = new URL(req.url);
        const action = url.searchParams.get('action') || '';
        const resource = url.searchParams.get('resource') || '';
        const userId = url.searchParams.get('userId') || '';
        const q = (url.searchParams.get('q') || '').trim();
        const from = url.searchParams.get('from') || '';
        const to = url.searchParams.get('to') || '';
        const format = url.searchParams.get('format') || '';
        const limitParam = parseInt(url.searchParams.get('limit') || '200', 10);
        const limit = Math.min(Math.max(isNaN(limitParam) ? 200 : limitParam, 1), 5000);

        const where: any = {};
        if (action && action !== 'ALL') where.action = { contains: action };
        if (resource && resource !== 'ALL') where.resource = resource;
        if (userId) where.userId = userId;
        if (q) {
            // Search across userName / resourceId / details (best-effort: details is JSON)
            where.OR = [
                { userName: { contains: q, mode: 'insensitive' } },
                { resourceId: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        if (format === 'csv') {
            const headers = ['Timestamp', 'Action', 'Resource', 'Resource ID', 'User', 'User Role', 'IP', 'Details'];
            const rows = logs.map((l) => [
                new Date(l.createdAt).toISOString(),
                l.action,
                l.resource,
                l.resourceId || '',
                l.userName,
                l.userRole,
                l.ipAddress || '',
                l.details ? JSON.stringify(l.details) : '',
            ]);
            const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n');
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="audit-logs-\${new Date().toISOString().slice(0, 10)}.csv"`,
                    'Cache-Control': 'no-store',
                },
            });
        }

        return NextResponse.json(logs);
    },
    { auth: 'admin' },
);
