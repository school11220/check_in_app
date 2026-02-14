import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTicketPDF } from '@/lib/pdf-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { Event: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Load site settings for styling
    let siteSettings: any = {};
    try {
      const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
      if (config) siteSettings = (config.settings as any) || {};
    } catch { /* ignore */ }

    const formattedDate = ticket.Event.date
      ? new Date(ticket.Event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'TBA';

    const pdfBase64 = await generateTicketPDF({
      ticketId: ticket.id,
      token: ticket.token || ticket.id,
      attendeeName: ticket.name,
      eventName: ticket.Event.name,
      eventDate: formattedDate,
      venue: ticket.Event.venue || 'TBA',
      amountPaid: ticket.Event.price || 0,
      transactionId: ticket.razorpayPaymentId || 'N/A',
      orderId: ticket.razorpayOrderId || 'N/A',
      paymentDate: new Date(ticket.createdAt).toLocaleString('en-IN'),
      layoutSettings: {
        bgColor: siteSettings.ticketBgColor,
        textColor: siteSettings.ticketTextColor,
        accentColor: siteSettings.ticketAccentColor,
        gradientColor: siteSettings.ticketGradientColor,
        logoUrl: siteSettings.ticketLogoUrl,
        fontFamily: siteSettings.ticketFontFamily,
        borderRadius: siteSettings.ticketBorderRadius,
        footerText: siteSettings.footerText || siteSettings.ticketFooterText,
        siteName: siteSettings.siteName || 'EventHub',
      },
    });

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${ticket.Event.name.replace(/[^a-z0-9]/gi, '-')}-${ticket.id.slice(-8)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('PDF download error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
