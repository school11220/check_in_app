import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionalEmail, isEmailConfigured } from '@/lib/email';
import { getSession, hasRole, ADMIN_ROLES } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/sanitize-html';

export interface CertificateEmailRequestBody {
  to: string;
  recipientName: string;
  eventName: string;
  pdfBase64: string; // Base64 encoded PDF content
  customMessage?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body: CertificateEmailRequestBody = await request.json();
    const { to, recipientName, eventName, pdfBase64, customMessage } = body;

    if (!to || !recipientName || !pdfBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (to.length > 320 || recipientName.length > 200 || eventName.length > 300 || customMessage && customMessage.length > 5000) {
      return NextResponse.json({ error: 'Email payload is too large' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
    }
    if (!hasRole(session.user.role, ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    const rateLimited = await enforceRateLimit(request, 'certificate-email', { requests: 20, window: '1 m' }, session.user.id);
    if (rateLimited) return rateLimited;

    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    if (!pdfBytes.length || pdfBytes.length > 10 * 1024 * 1024 || pdfBytes.subarray(0, 5).toString() !== '%PDF-') {
      return NextResponse.json({ error: 'Invalid certificate PDF' }, { status: 400 });
    }

    // Check if Email is configured
    if (!isEmailConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured',
      });
    }

    const subject = `Your Certificate for ${eventName}`;

    // Default message if not provided
    const messageBody = customMessage
      ? escapeHtml(customMessage).replace(/\n/g, '<br>')
      : `Thank you for your participation in <strong>${escapeHtml(eventName)}</strong>. We are proud to present you with this certificate of achievement.`;

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
                        <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Dear <strong>${escapeHtml(recipientName)}</strong>,</p>
                      <div style="font-size: 16px; color: #333333; line-height: 1.5; margin-bottom: 20px;">
                        ${messageBody}
                      </div>
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

    // Log payload size for debugging
    const payloadSize = JSON.stringify(body).length;
    console.log(`Processing certificate email. Payload size: ${(payloadSize / 1024).toFixed(2)} KB`);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      });
    } else {
      console.error('Email sending failed in API:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Certificate email error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email'
      },
      { status: 500 }
    );
  }
}
