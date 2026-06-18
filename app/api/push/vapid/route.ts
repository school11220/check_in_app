import { NextResponse } from 'next/server';

// Public VAPID public key. The private key is server-only.
export async function GET() {
    return NextResponse.json({
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    });
}
