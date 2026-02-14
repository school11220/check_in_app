import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

async function getUserRole(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
  } catch {
    return 'UNAUTHORIZED';
  }
}

// GET: List promo codes
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get('active') === 'true';

    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
      where.expiresAt = { gte: new Date() };
    }

    const promos = await prisma.promoCodeRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(promos);
  } catch (error) {
    console.error('Promo codes fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

// POST: Create promo code
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      code, discountType, discountValue, maxUses, maxUsesPerUser,
      minTickets, stackable, eventIds, expiresAt, startsAt,
    } = body;

    if (!code || !discountType || discountValue === undefined || !expiresAt) {
      return NextResponse.json({ error: 'Missing required fields: code, discountType, discountValue, expiresAt' }, { status: 400 });
    }

    // Check uniqueness
    const existing = await prisma.promoCodeRecord.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
    }

    const promo = await prisma.promoCodeRecord.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue: Math.round(discountValue),
        maxUses: maxUses || 100,
        maxUsesPerUser: maxUsesPerUser || 1,
        minTickets: minTickets || 1,
        stackable: stackable || false,
        eventIds: eventIds || [],
        expiresAt: new Date(expiresAt),
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        createdBy: userId,
      },
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (error: any) {
    console.error('Promo create error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create promo code' }, { status: 500 });
  }
}

// PATCH: Update promo code
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (!['ADMIN', 'ORGANIZER', 'ORGANISER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Promo code ID required' }, { status: 400 });

    if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);
    if (data.startsAt) data.startsAt = new Date(data.startsAt);

    const promo = await prisma.promoCodeRecord.update({
      where: { id },
      data,
    });

    return NextResponse.json(promo);
  } catch (error) {
    console.error('Promo update error:', error);
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
  }
}

// DELETE: Delete promo code
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    const role = await getUserRole(userId);
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete promo codes' }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Promo code ID required' }, { status: 400 });

    await prisma.promoCodeRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Promo delete error:', error);
    return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
  }
}
