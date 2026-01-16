import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ORGANIZER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.pricingRule.delete({
        where: { id: params.id },
    });

    return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'ORGANIZER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rule = await prisma.pricingRule.update({
        where: { id: params.id },
        data: body
    });

    return NextResponse.json(rule);
}
