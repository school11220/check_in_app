import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTimedQRToken } from '@/lib/qr-security';
import { generateQRCodeBase64 } from '@/lib/qr-generator';
import { authorizeTicketAccess } from '@/lib/ticket-access';
import { generateTicketToken } from '@/lib/ticket-security';
import { isPaidLikeStatus } from '@/lib/ticket-lifecycle';

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
    const url = new URL(req.url);
    const providedToken = url.searchParams.get('token');

    let ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, token: true, status: true, checkedIn: true, eventId: true, userId: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const access = await authorizeTicketAccess(ticket, providedToken);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Ticket token or authorized session required' }, { status: 401 });
    }

    if (isPaidLikeStatus(ticket.status) && !ticket.token && (access.canManage || access.isOwner || access.hasValidToken)) {
      ticket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { token: generateTicketToken(ticketId) },
        select: { id: true, token: true, status: true, checkedIn: true, eventId: true, userId: true },
      });
    }

    if (!isPaidLikeStatus(ticket.status)) {
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
