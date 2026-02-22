import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

async function checkAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) || '';
    if (role !== 'ADMIN') return null;
    return userId;
}

// GET - List all promo codes
export async function GET() {
    try {
        const userId = await checkAdmin();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const promoCodes = await prisma.promoCodeRecord.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(promoCodes);
    } catch (error) {
        console.error('Failed to fetch promo codes:', error);
        return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
    }
}

// POST - Create a promo code
export async function POST(request: NextRequest) {
    try {
        const userId = await checkAdmin();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { code, discountType, discountValue, maxUses, eventIds, expiresAt, isActive } = body;

        if (!code || !discountType || discountValue == null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check for duplicate code
        const existing = await prisma.promoCodeRecord.findUnique({ where: { code: code.toUpperCase() } });
        if (existing) {
            return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
        }

        const promoCode = await prisma.promoCodeRecord.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseInt(discountValue),
                maxUses: maxUses || 100,
                usedCount: 0,
                eventIds: eventIds || [],
                expiresAt: new Date(expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000),
                isActive: isActive !== false,
                createdBy: userId,
            }
        });

        return NextResponse.json(promoCode, { status: 201 });
    } catch (error) {
        console.error('Failed to create promo code:', error);
        return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
    }
}

// PATCH - Update a promo code
export async function PATCH(request: NextRequest) {
    try {
        const userId = await checkAdmin();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing promo code ID' }, { status: 400 });
        }

        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase();
        }
        if (updateData.discountValue != null) {
            updateData.discountValue = parseInt(updateData.discountValue);
        }
        if (updateData.expiresAt) {
            updateData.expiresAt = new Date(updateData.expiresAt);
        }

        const promoCode = await prisma.promoCodeRecord.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(promoCode);
    } catch (error) {
        console.error('Failed to update promo code:', error);
        return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
    }
}

// DELETE - Delete a promo code
export async function DELETE(request: NextRequest) {
    try {
        const userId = await checkAdmin();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing promo code ID' }, { status: 400 });
        }

        await prisma.promoCodeRecord.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete promo code:', error);
        return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
    }
}
