import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

interface CohortRow {
    cohortMonth: string;
    cohortSize: number;
    retention: Record<string, number>;
}

export async function GET(_request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = await prisma.ticket.findMany({
        where: { status: { in: ['paid', 'partially_refunded', 'checked_in'] } },
        select: { email: true, createdAt: true, checkedInAt: true, eventId: true },
    }).catch(() => [] as any[]);

    const byEmail = new Map<string, typeof tickets>();
    for (const t of tickets) {
        if (!t.email) continue;
        const arr = byEmail.get(t.email) || [];
        arr.push(t);
        byEmail.set(t.email, arr);
    }

    const cohorts = new Map<string, Set<string>>();
    for (const [email, ts] of byEmail.entries()) {
        const sorted = [...ts].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        const first = sorted[0];
        if (!first) continue;
        const key = monthKey(new Date(first.createdAt));
        const set = cohorts.get(key) || new Set();
        set.add(email);
        cohorts.set(key, set);
    }

    const rows: CohortRow[] = [];
    const months = Array.from(cohorts.keys()).sort();
    for (const cohort of months) {
        const emails = cohorts.get(cohort) || new Set();
        const retention: Record<string, number> = {};
        for (let offset = 0; offset < 12; offset++) {
            const monthDate = addMonths(parseMonthKey(cohort), offset);
            const monthEnd = new Date(monthDate);
            monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
            const active = new Set<string>();
            for (const email of emails) {
                const ts = byEmail.get(email) || [];
                const hit = ts.some(t => {
                    const d = new Date(t.createdAt);
                    return d >= monthDate && d < monthEnd;
                });
                if (hit) active.add(email);
            }
            retention[`m${offset}`] = emails.size > 0 ? Math.round((active.size / emails.size) * 100) : 0;
        }
        rows.push({ cohortMonth: cohort, cohortSize: emails.size, retention });
    }

    return NextResponse.json({ rows });
}

function monthKey(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function parseMonthKey(key: string): Date {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, (m || 1) - 1, 1));
}
function addMonths(d: Date, n: number): Date {
    const x = new Date(d);
    x.setUTCMonth(x.getUTCMonth() + n);
    return x;
}
