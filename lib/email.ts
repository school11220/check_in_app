import nodemailer from 'nodemailer';

// Create SMTP transporter
function createTransporter() {
    // Gmail Strategy: explicit GMAIL env vars or service='gmail'
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });
    }

    // Fallback: Generic Custom SMTP
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
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
 * Send a transactional email
 */
export async function sendEmail(
    options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const transporter = createTransporter();

    // Determine sender
    const senderEmail = process.env.SENDER_EMAIL || process.env.GMAIL_USER || 'noreply@eventhub.com';
    const senderName = process.env.SENDER_NAME || 'EventHub';

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
        console.log('Sending email to:', options.to);
        // Skip verify() for performance in production logic as it adds round trip latency
        // await transporter.verify(); 

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully, messageId:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error: any) {
        console.error('Email sending error details:', {
            message: error?.message || error,
            code: error?.code,
            command: error?.command,
            response: error?.response
        });
        return {
            success: false,
            error: error?.message || 'Failed to send email',
        };
    }
}

/**
 * Check if Email is configured
 */
export function isEmailConfigured(): boolean {
    const gmailConfigured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    console.log('Email configured check:', 'Gmail:', gmailConfigured, 'SMTP:', smtpConfigured);
    return gmailConfigured || smtpConfigured;
}

// Aliases for backward compatibility
export const sendTransactionalEmail = sendEmail;
export const isBrevoConfigured = isEmailConfigured;
