import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

async function getUserRole(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.publicMetadata?.role as string) || 'UNAUTHORIZED';
  } catch { return 'UNAUTHORIZED'; }
}

// POST: Validate and apply a promo code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, eventId, quantity, userEmail } = body;

    if (!code || !eventId) {
      return NextResponse.json({ error: 'Code and eventId required' }, { status: 400 });
    }

    const promo = await prisma.promoCodeRecord.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo) {
      return NextResponse.json({ valid: false, error: 'Promo code not found' }, { status: 404 });
    }

    // Check active
    if (!promo.isActive) {
      return NextResponse.json({ valid: false, error: 'This promo code is no longer active' });
    }

    // Check date range
    const now = new Date();
    if (now < promo.startsAt) {
      return NextResponse.json({ valid: false, error: 'This promo code is not yet active' });
    }
    if (now > promo.expiresAt) {
      return NextResponse.json({ valid: false, error: 'This promo code has expired' });
    }

    // Check global usage limit
    if (promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit' });
    }

    // Check event restriction
    if (promo.eventIds.length > 0 && !promo.eventIds.includes(eventId)) {
      return NextResponse.json({ valid: false, error: 'This promo code is not valid for this event' });
    }

    // Check min tickets
    if (quantity && quantity < promo.minTickets) {
      return NextResponse.json({ valid: false, error: `Minimum ${promo.minTickets} ticket(s) required for this promo` });
    }

    // Check per-user limit
    if (userEmail && promo.maxUsesPerUser > 0) {
      const userUsages = await prisma.promoUsage.count({
        where: { promoCode: promo.code, userId: userEmail },
      });
      if (userUsages >= promo.maxUsesPerUser) {
        return NextResponse.json({ valid: false, error: 'You have already used this promo code the maximum number of times' });
      }
    }

    return NextResponse.json({
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        stackable: promo.stackable,
        minTickets: promo.minTickets,
      },
    });
  } catch (error) {
    console.error('Promo validate error:', error);
    return NextResponse.json({ error: 'Failed to validate promo code' }, { status: 500 });
  }
}
