import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { processDueReminders } from '@/lib/reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!secret || secret.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ success: true, ...(await processDueReminders()) });
  } catch (error) {
    console.error('[reminders cron]', error);
    return NextResponse.json({ error: 'Reminder processing failed' }, { status: 500 });
  }
}
