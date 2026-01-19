import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const event = await prisma.event.findUnique({
            where: { id },
            include: { pricingRules: true },
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event);
    } catch (error) {
        console.error('Failed to fetch event:', error);
        return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check permissions: Admin can edit any, Organizer can only edit assigned
        if (session.user.role === 'ORGANIZER') {
            const assignedIds = session.user.assignedEventIds || [];
            if (!assignedIds.includes(id)) {
                return NextResponse.json({ error: 'Forbidden: Not assigned to this event' }, { status: 403 });
            }
        } else if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { ...data } = body;

        if (data.date) data.date = new Date(data.date);

        const event = await prisma.event.update({
            where: { id },
            data,
        });

        // Log event update
        await logAudit({
            action: 'UPDATE',
            resource: 'EVENT',
            resourceId: id,
            details: { eventName: event.name, changes: Object.keys(data) },
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userRole: session.user.role,
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error('Failed to update event:', error);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
        }

        const { id } = await params;

        // Get event name before deletion for logging
        const event = await prisma.event.findUnique({ where: { id }, select: { name: true } });

        await prisma.event.delete({ where: { id } });

        // Log event deletion
        await logAudit({
            action: 'DELETE',
            resource: 'EVENT',
            resourceId: id,
            details: { eventName: event?.name },
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userRole: session.user.role,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete event:', error);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
