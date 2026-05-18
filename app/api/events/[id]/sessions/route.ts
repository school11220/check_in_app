import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function buildSessionData(body: Record<string, unknown>, eventId: string) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : '';
    const endTime = typeof body.endTime === 'string' ? body.endTime.trim() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const type = typeof body.type === 'string' && body.type.trim() ? body.type.trim() : 'talk';

    if (!title || !date || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
        return { error: 'Title, date, start time, and end time are required' };
    }

    if (startTime >= endTime) {
        return { error: 'End time must be after start time' };
    }

    const capacity = body.capacity === undefined || body.capacity === null || body.capacity === ''
        ? 100
        : Number(body.capacity);

    if (!Number.isFinite(capacity) || capacity < 1) {
        return { error: 'Capacity must be a positive number' };
    }

    return {
        data: {
            eventId,
            title,
            description: typeof body.description === 'string' ? body.description.trim() : null,
            type,
            speakerName: typeof body.speakerName === 'string' ? body.speakerName.trim() || null : null,
            speakerRole: typeof body.speakerRole === 'string' ? body.speakerRole.trim() || null : null,
            startTime,
            endTime,
            date,
            capacity,
        },
    };
}

async function requireEventAccess(eventId: string) {
    const session = await getSession();
    return !!session && hasRole(session.user.role, ORGANIZER_ROLES) && hasEventAccess(session, eventId);
}

// GET: Fetch all sessions for an event
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!(await requireEventAccess(id))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date');

        const where: { eventId: string; date?: string } = { eventId: id };
        if (date) {
            where.date = date;
        }

        const sessions = await prisma.session.findMany({
            where,
            orderBy: { startTime: 'asc' }
        });
        return NextResponse.json(sessions);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

// POST: Create a new session
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!(await requireEventAccess(id))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const built = buildSessionData(body, id);

        if (!built.data) {
            return NextResponse.json({ error: built.error }, { status: 400 });
        }

        const session = await prisma.session.create({
            data: {
                id: crypto.randomUUID(),
                ...built.data,
                updatedAt: new Date(),
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

// PUT: Update session
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!(await requireEventAccess(id))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionId = request.nextUrl.searchParams.get('sessionId');
        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const existing = await prisma.session.findFirst({
            where: { id: sessionId, eventId: id },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const body = await request.json();
        const built = buildSessionData(body, id);

        if (!built.data) {
            return NextResponse.json({ error: built.error }, { status: 400 });
        }

        const session = await prisma.session.update({
            where: { id: sessionId },
            data: {
                ...built.data,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error('Failed to update session:', error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}

// DELETE: Delete session
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        if (!(await requireEventAccess(id))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const deleted = await prisma.session.deleteMany({
            where: { id: sessionId, eventId: id }
        });

        if (deleted.count === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
