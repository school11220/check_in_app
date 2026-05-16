
import { sendTransactionalEmail, isEmailConfigured } from '@/lib/email';
import { generateTicketPDF } from '@/lib/pdf-generator';
import { generateQRCodeBase64 } from '@/lib/qr-generator';
import { CertificateTemplate } from '@prisma/client';

export interface TicketEmailData {
  to: string;
  subject?: string;
  ticketId: string;
  token: string;
  eventName: string;
  attendeeName: string;
  eventDate: string;
  venue: string;
  amountPaid: number;
  transactionId: string;
  orderId: string;
  paymentDate?: string;
  paymentMode?: string;
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

export async function sendTicketEmail(data: TicketEmailData) {
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
  } = data;

  if (!to || !ticketId || !eventName) {
    throw new Error('Missing required fields');
  }

  // Check if Email is configured
  if (!isEmailConfigured()) {
    console.warn('Email service not configured - email will not be sent');
    return {
      success: true,
      message: 'Email skipped (Email service not configured)',
      demo: true,
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ticketUrl = `${baseUrl}/ticket/${ticketId}?success=true&token=${encodeURIComponent(token)}`;
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

  // Load settings from Database (Prisma)
  let settings: any = {};
  let template: any = null;

  try {
    const { prisma } = await import('@/lib/prisma');
    const config = await prisma.siteConfig.findUnique({
      where: { id: 'default' }
    });

    if (config) {
      settings = {
        siteSettings: config.settings,
        emailTemplates: config.templates
      };

      // Find confirmation template
      if (config.templates) {
        const templates = config.templates as any[];
        template = templates.find((t: any) => t.type === 'confirmation' && t.isActive);
      }
    }
  } catch (err) {
    console.error('Failed to load settings from DB:', err);
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

  // Variable replacement for body
  if (template) {
    Object.keys(variables).forEach(key => {
      bodyContent = bodyContent.replace(new RegExp(key, 'g'), variables[key]);
    });
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
                
                 <!-- Payment Details -->
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
  }

  // Send email via SMTP
  return await sendTransactionalEmail({
    to,
    toName: attendeeName || undefined,
    subject: subjectLine,
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
}

// -- CERTIFICATE EMAIL --

export async function sendCertificateEmail(data: TicketEmailData & { certificateTemplate?: CertificateTemplate }) {
  const {
    to,
    attendeeName,
    eventName,
    ticketId,
    emailStyles,
    certificateTemplate,
    eventDate
  } = data;

  if (!to || !ticketId || !eventName) {
    throw new Error('Missing required fields for certificate email');
  }

  // Check Email Config
  if (!isEmailConfigured()) {
    console.warn('Email service not configured - certificate email skipped');
    return { success: true, message: 'Email skipped (Service not configured)', demo: true, messageId: undefined };
  }

  // Generate Certificate PDF
  let pdfBase64 = '';
  try {
    const { generateCertificatePDF } = await import('@/lib/certificate-generator');
    pdfBase64 = await generateCertificatePDF({
      ticketId,
      attendeeName: attendeeName || 'Participant',
      eventName,
      eventDate: eventDate ? new Date(eventDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) : 'TBA',
      template: certificateTemplate ? {
        bgImage: certificateTemplate.bgImage || undefined,
        elements: (certificateTemplate.elements as any) || undefined
      } : undefined,
      verificationUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-certificate/${ticketId}`
    });
  } catch (err) {
    console.error('Certificate generation failed:', err);
    throw new Error('Failed to generate certificate PDF');
  }

  const subject = `Certificate of Participation - ${eventName}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; text-align: center;">
          <h2 style="color: #333;">Congratulations, ${attendeeName}!</h2>
          <p style="color: #555; font-size: 16px;">
            Thank you for participating in <strong>${eventName}</strong>.
          </p>
          <p style="color: #555;">
            We are pleased to present you with this Certificate of Participation.
          </p>
          <div style="margin: 30px 0;">
             <!-- Download link could be a direct link if we stored it, but here it's an attachment -->
             <p style="background-color: ${emailStyles?.accentColor || '#dc2626'}; color: white; display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Certificate Attached
            </p>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            Your certificate is attached to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  return await sendTransactionalEmail({
    to,
    toName: attendeeName,
    subject,
    htmlContent,
    attachments: [
      {
        filename: `Certificate - ${attendeeName}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ],
  });
}
