import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail, isEmailConfigured } from '@/lib/email';
import { generateTicketPDF } from '@/lib/pdf-generator';
import { generateQRCodeBase64 } from '@/lib/qr-generator';
import { sendTicketConfirmationSMS, isSMSConfigured } from '@/lib/sms';

// POST: Send ticket via email and/or SMS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, sendEmail: shouldSendEmail = true, sendSMS: shouldSendSMS = true } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { Event: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const results: { email?: any; sms?: any } = {};
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Load site settings for email styling
    let siteSettings: any = {};
    try {
      const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
      if (config) siteSettings = (config.settings as any) || {};
    } catch { /* ignore */ }

    const formattedDate = ticket.Event.date
      ? new Date(ticket.Event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'TBA';

    // Send Email
    if (shouldSendEmail && ticket.email) {
      if (!isEmailConfigured()) {
        results.email = { success: false, error: 'Email service not configured' };
      } else {
        try {
          const ticketUrl = `${baseUrl}/ticket/${ticket.id}?success=true`;
          const qrPayload = JSON.stringify({ ticketId: ticket.id, token: ticket.token });
          const qrCodeBase64 = await generateQRCodeBase64(qrPayload, { width: 180 });

          // Generate PDF attachment
          let pdfBase64 = '';
          try {
            pdfBase64 = await generateTicketPDF({
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
          } catch (pdfErr) {
            console.error('PDF generation failed:', pdfErr);
          }

          const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#000;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#111;border-radius:16px;overflow:hidden;border:1px solid #333;">
        <tr><td style="background:linear-gradient(135deg,${siteSettings.ticketAccentColor || '#dc2626'},${siteSettings.ticketGradientColor || '#991b1b'});padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Your Ticket is Ready!</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${ticket.Event.name}</p>
        </td></tr>
        <tr><td style="padding:30px;color:#fff;font-size:16px;line-height:1.6;">
          <h2 style="margin-top:0;">Hi ${ticket.name},</h2>
          <p>Your ticket has been confirmed. Here are the details:</p>
          <div style="background:rgba(255,255,255,0.05);padding:20px;border-radius:8px;margin:20px 0;">
            <p style="margin:5px 0;font-size:14px;color:#888;">DATE</p>
            <p style="margin:0 0 15px 0;font-weight:bold;">${formattedDate}</p>
            <p style="margin:5px 0;font-size:14px;color:#888;">VENUE</p>
            <p style="margin:0;font-weight:bold;">${ticket.Event.venue || 'TBA'}</p>
          </div>
          <div style="text-align:center;margin:30px 0;padding:20px;background:#fff;border-radius:12px;">
            <img src="cid:qrcode" alt="QR Code" style="width:150px;height:150px;">
            <p style="margin:10px 0 0;font-size:12px;color:#666;">Scan at venue for entry</p>
          </div>
          <div style="text-align:center;margin:30px 0;">
            <a href="${ticketUrl}" style="display:inline-block;padding:14px 30px;background:${siteSettings.ticketAccentColor || '#dc2626'};color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">View Ticket Online</a>
          </div>
          <p style="font-size:13px;color:#888;text-align:center;">A PDF copy of your ticket is attached to this email.</p>
        </td></tr>
        <tr><td style="padding:20px;background:#0a0a0a;text-align:center;border-top:1px solid #333;">
          <p style="color:#666;font-size:12px;margin:0;">${siteSettings.siteName || 'EventHub'} &bull; Secure Event Ticketing</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

          const attachments: any[] = [];
          if (pdfBase64) {
            attachments.push({
              filename: `ticket-${ticket.id.slice(-8)}.pdf`,
              content: pdfBase64,
              contentType: 'application/pdf',
            });
          }

          const emailResult = await sendTransactionalEmail({
            to: ticket.email,
            toName: ticket.name,
            subject: `Your ticket for ${ticket.Event.name} - Confirmed!`,
            htmlContent: emailHtml,
            attachments: attachments.length > 0 ? attachments : undefined,
          });

          results.email = emailResult;
        } catch (emailErr: any) {
          results.email = { success: false, error: emailErr.message };
        }
      }
    }

    // Send SMS
    if (shouldSendSMS && ticket.phone) {
      try {
        const smsResult = await sendTicketConfirmationSMS({
          phone: ticket.phone,
          attendeeName: ticket.name,
          eventName: ticket.Event.name,
          eventDate: formattedDate,
          ticketId: ticket.id,
        });
        results.sms = smsResult;
      } catch (smsErr: any) {
        results.sms = { success: false, error: smsErr.message };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket delivery initiated',
      results,
    });
  } catch (error: any) {
    console.error('Ticket delivery error:', error);
    return NextResponse.json({ error: error.message || 'Delivery failed' }, { status: 500 });
  }
}
