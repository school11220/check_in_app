import nodemailer from 'nodemailer';

// Create Brevo SMTP transporter
// Your API key format (xsmtpsib-...) is an SMTP key, so we use nodemailer
// Create SMTP transporter (Supports Gmail & Brevo)
function createTransporter() {
    // If using Gmail, we can use the 'gmail' service which automatically configures host/port
    if (process.env.SMTP_SERVICE === 'gmail' || process.env.BREVO_SMTP_LOGIN?.includes('gmail')) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.BREVO_SMTP_LOGIN, // Your Gmail address
                pass: process.env.BREVO_API_KEY,    // Your Gmail App Password
            },
        });
    }

    // Default to Brevo/Standard SMTP
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.BREVO_SMTP_LOGIN || '',
            pass: process.env.BREVO_API_KEY || '',
        },
    });
}

export interface EmailAttachment {
    filename: string;
    content: string; // base64 encoded
    contentType?: string;
    encoding?: string;
}

export interface SendEmailOptions {
    to: string;
    toName?: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    attachments?: EmailAttachment[];
}

/**
 * Send a transactional email using Brevo SMTP
 */
export async function sendTransactionalEmail(
    options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const transporter = createTransporter();

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@eventhub.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'EventHub';

    const mailOptions: nodemailer.SendMailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
        subject: options.subject,
        html: options.htmlContent,
        text: options.textContent,
    };

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            encoding: att.encoding || 'base64',
            contentType: att.contentType,
        }));
    }

    try {
        console.log('Sending email via Brevo SMTP to:', options.to);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully, messageId:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error: any) {
        console.error('Brevo SMTP error:', error?.message || error);
        return {
            success: false,
            error: error?.message || 'Failed to send email',
        };
    }
}

/**
 * Check if Brevo is configured
 */
export function isBrevoConfigured(): boolean {
    const configured = !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
    console.log('Brevo configured:', configured, 'API Key:', process.env.BREVO_API_KEY ? 'SET' : 'NOT SET', 'Sender:', process.env.BREVO_SENDER_EMAIL || 'NOT SET');
    return configured;
}
