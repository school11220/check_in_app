import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTimedQRToken } from '@/lib/qr-security';
import { generateQRCodeBase64 } from '@/lib/qr-generator';

/**
 * GET /api/tickets/[id]/qr
 *
 * Generate a time-limited, tamper-proof QR code for a ticket.
 * The QR code includes an HMAC signature and expires after 5 minutes.
 * Prevents screenshots from being reused (replay protection).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, token: true, status: true, checkedIn: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.status !== 'paid') {
      return NextResponse.json({ error: 'Ticket is not valid' }, { status: 400 });
    }

    if (ticket.checkedIn) {
      return NextResponse.json({ error: 'Ticket already checked in' }, { status: 400 });
    }

    if (!ticket.token) {
      return NextResponse.json({ error: 'Ticket has no token' }, { status: 400 });
    }

    // Generate a timed QR token (expires in 5 minutes)
    const timedToken = generateTimedQRToken(ticket.id, ticket.token);

    // Build QR payload - the check-in scanner will read this
    const qrPayload = JSON.stringify({
      ticketId: ticket.id,
      timedToken,
    });

    // Generate QR code image as base64
    const qrBase64 = await generateQRCodeBase64(qrPayload, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });

    return NextResponse.json({
      qrCode: `data:image/png;base64,${qrBase64}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      ticketId: ticket.id,
    });
  } catch (error: any) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
