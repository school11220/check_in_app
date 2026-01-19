import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, assignedEventIds: true, createdAt: true }
    });

    return NextResponse.json(users);
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, email, password, role, assignedEventIds } = body;

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                assignedEventIds: assignedEventIds || [],
            },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });

        // Create audit log entry
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                resource: 'User',
                resourceId: user.id,
                details: { name: user.name, email: user.email, role: user.role },
                userId: session.user.id,
                userName: session.user.name || session.user.email,
                userRole: session.user.role,
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
