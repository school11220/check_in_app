import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { prisma } from '@/lib/prisma';
import { upsertUserFromClerk } from '@/lib/user-sync';

export async function POST(request: NextRequest) {
  try {
    const event = await verifyWebhook(request);

    if (event.type === 'user.created' || event.type === 'user.updated') {
      await upsertUserFromClerk(event.data as any);
      return NextResponse.json({ success: true });
    }

    if (event.type === 'user.deleted') {
      const deletedUserId = (event.data as any)?.id as string | undefined;
      if (deletedUserId) {
        await prisma.user.delete({ where: { id: deletedUserId } }).catch(() => null);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }
}
