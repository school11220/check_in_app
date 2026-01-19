import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail, isBrevoConfigured } from '@/lib/email';

export interface CertificateEmailRequestBody {
  to: string;
  recipientName: string;
  eventName: string;
  pdfBase64: string; // Base64 encoded PDF content
}

export async function POST(request: NextRequest) {
  try {
    const body: CertificateEmailRequestBody = await request.json();
    const { to, recipientName, eventName, pdfBase64 } = body;

    if (!to || !recipientName || !pdfBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if Brevo is configured
    if (!isBrevoConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured',
      });
    }

    const subject = `🎓 Your Certificate for ${eventName}`;

    // Simple HTML email for certificate
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 30px; text-align: center; background-color: #E11D2E;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Congratulations!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px;">
                      <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Dear <strong>${recipientName}</strong>,</p>
                      <p style="font-size: 16px; color: #333333; line-height: 1.5; margin-bottom: 20px;">
                        Thank you for your participation in <strong>${eventName}</strong>. We are proud to present you with this certificate of achievement.
                      </p>
                      <p style="font-size: 16px; color: #333333; margin-bottom: 30px;">
                        Your certificate is attached to this email as a PDF.
                      </p>
                      <p style="font-size: 14px; color: #666666; margin-top: 30px;">
                        Best regards,<br>
                        EventHub Team
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

    const result = await sendTransactionalEmail({
      to,
      toName: recipientName,
      subject,
      htmlContent: emailHtml,
      attachments: [
        {
          filename: `${recipientName.replace(/\s+/g, '_')}_Certificate.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Certificate email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
