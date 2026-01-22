import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail, isBrevoConfigured } from '@/lib/email';
import { generateTicketPDF } from '@/lib/pdf-generator';
import { generateQRCodeBase64 } from '@/lib/qr-generator';

export interface EmailRequestBody {
  to: string;
  subject?: string;
  ticketId: string;
  token: string;
  eventName: string;
  attendeeName: string;
  eventDate: string;
  venue: string;
  // Payment details
  amountPaid: number; // in paise
  transactionId: string; // razorpay_payment_id
  orderId: string; // razorpay_order_id
  paymentDate?: string;
  paymentMode?: string;
  // Styling options
  emailStyles?: {
    bgColor?: string;
    textColor?: string;
    accentColor?: string;
    gradientColor?: string;
    borderRadius?: number;
    fontFamily?: string;
    logoUrl?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequestBody = await request.json();
    const {
      to,
      subject,
      ticketId,
      token,
      eventName,
      attendeeName,
      eventDate,
      venue,
      amountPaid,
      transactionId,
      orderId,
      paymentDate,
      paymentMode,
      emailStyles,
    } = body;

    if (!to || !ticketId || !eventName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if Brevo is configured
    if (!isBrevoConfigured()) {
      console.warn('Brevo not configured - email will not be sent');
      return NextResponse.json({
        success: true,
        message: 'Email skipped (Brevo not configured)',
        demo: true,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const ticketUrl = `${baseUrl}/ticket/${ticketId}?success=true`;
    const formattedPaymentDate = paymentDate || new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const formattedEventDate = eventDate
      ? new Date(eventDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      : 'TBA';

    // Load settings from Database (Prisma) to ensure we use the latest Admin edits
    let settings: any = {};
    let template: any = null;

    try {
      // Import prisma dynamically if not available globally in this scope or use the global one if imported
      // We'll assume we need to import it or use the one we add to imports
      const config = await import('@/lib/prisma').then(m => m.prisma.siteConfig.findUnique({
        where: { id: 'default' }
      }));

      if (config) {
        settings = {
          siteSettings: config.settings,
          emailTemplates: config.templates
        };

        // Find confirmation template
        if (settings.emailTemplates) {
          // Allow 'any' cast for the template array items as their type is JSON in Prisma
          const templates = settings.emailTemplates as any[];
          template = templates.find((t: any) => t.type === 'confirmation' && t.isActive);
        }
      }
    } catch (err) {
      console.error('Failed to load settings from DB:', err);
      // Fallback to defaults (empty settings object)
    }

    // Merge styles: Request > Settings > Defaults
    const siteSettings = settings.siteSettings || {};
    const s = {
      bgColor: emailStyles?.bgColor || siteSettings.ticketBgColor || '#111111',
      textColor: emailStyles?.textColor || siteSettings.ticketTextColor || '#ffffff',
      accentColor: emailStyles?.accentColor || siteSettings.ticketAccentColor || '#dc2626',
      gradientColor: emailStyles?.gradientColor || siteSettings.ticketGradientColor || '#991b1b',
      borderRadius: emailStyles?.borderRadius || siteSettings.ticketBorderRadius || 16,
      fontFamily: emailStyles?.fontFamily || siteSettings.ticketFontFamily || 'inter',
    };

    // Generate QR code for inline display
    const qrCodeBase64 = await generateQRCodeBase64(
      `${baseUrl}/ticket/${ticketId}?token=${token}`,
      { width: 180 }
    );

    // Prepare Template Variables
    const variables: Record<string, string> = {
      '{{name}}': attendeeName,
      '{{eventName}}': eventName,
      '{{eventDate}}': formattedEventDate,
      '{{eventTime}}': eventDate ? new Date(eventDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'TBA',
      '{{eventVenue}}': venue || 'TBA',
      '{{ticketId}}': ticketId,
      '{{siteName}}': siteSettings.siteName || 'EventHub',
      '{{qrCode}}': `<img src="cid:qrcode" alt="QR Code" style="width: 150px; height: 150px;">`,
      '{{ticketLink}}': `<a href="${ticketUrl}" style="color: ${s.accentColor}">View Ticket</a>`,
    };

    let subjectLine = subject || (template ? template.subject : `Your ticket for ${eventName} - Confirmed!`);
    let bodyContent = template ? template.body : '';

    // Replace variables in subject
    Object.keys(variables).forEach(key => {
      subjectLine = subjectLine.replace(new RegExp(key, 'g'), variables[key]);
    });

    // If no template, use default HTML structure (fallback)
    // If template exists, we wrap it in a nice container
    // We assume the template body is just the text/content, not full HTML

    // Simple variable replacement for body
    if (template) {
      Object.keys(variables).forEach(key => {
        bodyContent = bodyContent.replace(new RegExp(key, 'g'), variables[key]);
      });
      // Convert newlines to <br> for plain text templates
      bodyContent = bodyContent.replace(/\n/g, '<br>');
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Ticket</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: ${s.fontFamily}, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${s.bgColor}; border-radius: ${s.borderRadius}px; overflow: hidden; border: 1px solid #333333;">
                  <!-- Header -->
                  <tr>
                    <td style="background: ${s.accentColor}; background: linear-gradient(135deg, ${s.accentColor}, ${s.gradientColor}); padding: 30px; text-align: center;">
                       ${emailStyles?.logoUrl || siteSettings.ticketLogoUrl ? `<img src="${emailStyles?.logoUrl || siteSettings.ticketLogoUrl}" alt="Logo" style="height: 40px; margin-bottom: 10px; opacity: 0.9;">` : ''}
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${template ? 'Ticket Confirmed' : 'Your Ticket is Confirmed!'}</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px; color: ${s.textColor}; font-size: 16px; line-height: 1.6;">
                      ${template
        ? bodyContent
        : `
                        <h2 style="margin-top:0;">Hi ${attendeeName},</h2>
                        <p>Thank you for your purchase. Here is your ticket for <strong>${eventName}</strong>.</p>
                        `
      }
                      
                      ${!template ? `
                      <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin:5px 0; font-size:14px; color:#888;">DATE & TIME</p>
                        <p style="margin:0 0 15px 0; font-weight:bold;">${formattedEventDate}</p>
                        
                        <p style="margin:5px 0; font-size:14px; color:#888;">VENUE</p>
                        <p style="margin:0; font-weight:bold;">${venue || 'TBA'}</p>
                      </div>
                      ` : ''}

                       <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #ffffff; border-radius: 12px; color: #000;">
                        <img src="cid:qrcode" alt="Ticket QR Code" style="width: 150px; height: 150px;">
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Scan at venue</p>
                      </div>

                       <div style="text-align: center; margin-top: 30px;">
                          <a href="${ticketUrl}" style="display: inline-block; padding: 14px 30px; background-color: ${s.accentColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">View Ticket</a>
                       </div>
                    </td>
                  </tr>
                  
                   <!-- Payment Details (Always show at bottom unless template forbids - but we keep it for receipt) -->
                   <tr>
                     <td style="padding: 0 30px 30px 30px;">
                       <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid #333;">
                         <tr>
                            <td style="padding: 15px; text-align:center;">
                                <p style="margin:0; font-size:12px; color:#888;">Total Paid: ₹${((amountPaid || 0) / 100).toFixed(2)} • Txn: ${transactionId}</p>
                            </td>
                         </tr>
                       </table>
                     </td>
                   </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px; background-color: #0a0a0a; text-align: center; border-top: 1px solid #333333;">
                      <p style="color: #666666; font-size: 12px; margin: 0;">
                        ${siteSettings.footerText || 'EventHub • Secure Event Ticketing'}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Generate PDF ticket
    let pdfBase64 = '';
    try {
      pdfBase64 = await generateTicketPDF({
        ticketId,
        token: token || ticketId,
        attendeeName: attendeeName || 'Guest',
        eventName,
        eventDate: formattedEventDate,
        venue: venue || 'TBA',
        amountPaid: amountPaid || 0,
        transactionId: transactionId || 'N/A',
        orderId: orderId || 'N/A',
        paymentDate: formattedPaymentDate,
        paymentMode,
        // Pass ticket layout settings from admin config
        layoutSettings: {
          bgColor: siteSettings.ticketBgColor || s.bgColor,
          textColor: siteSettings.ticketTextColor || s.textColor,
          accentColor: siteSettings.ticketAccentColor || s.accentColor,
          gradientColor: siteSettings.ticketGradientColor || s.gradientColor,
          logoUrl: siteSettings.ticketLogoUrl,
          fontFamily: siteSettings.ticketFontFamily,
          borderRadius: siteSettings.ticketBorderRadius,
          footerText: siteSettings.footerText || siteSettings.ticketFooterText,
          siteName: siteSettings.siteName || 'EventHub',
        },
      });
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue without PDF if generation fails
    }

    // Send email via Brevo
    const result = await sendTransactionalEmail({
      to,
      toName: attendeeName || undefined,
      subject: subject || `Your ticket for ${eventName} - Confirmed!`,
      htmlContent: emailHtml,
      attachments: pdfBase64
        ? [
          {
            filename: `ticket-${ticketId}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
        ]
        : undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
      });
    } else {
      console.error('Email sending failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
