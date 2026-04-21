/**
 * WhatsApp Service using WhatsApp Cloud API (Meta)
 * 
 * Free Tier: 1,000 conversations/month
 * 
 * Setup:
 * 1. Create a Meta Business account
 * 2. Go to developers.facebook.com and create an app
 * 3. Add WhatsApp product to your app
 * 4. Get your Phone Number ID and Access Token
 * 5. Add to .env:
 *    - WHATSAPP_PHONE_NUMBER_ID
 *    - WHATSAPP_ACCESS_TOKEN
 */

export interface WhatsAppMessage {
    to: string; // Phone number with country code (e.g., "919876543210")
    templateName?: string;
    templateParams?: string[];
    message?: string; // For free-form messages (only works in 24hr window)
}

export interface WhatsAppResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
    return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Format phone number for WhatsApp (with country code, no +)
 */
function formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    // Add India country code if not present
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
}

/**
 * Send WhatsApp template message
 * Note: For business-initiated messages, you must use pre-approved templates
 */
export async function sendWhatsAppTemplate(message: WhatsAppMessage): Promise<WhatsAppResult> {
    if (!isWhatsAppConfigured()) {
        console.log('[WhatsApp] Not configured, logging message:');
        console.log(`[WhatsApp] To: ${message.to}`);
        console.log(`[WhatsApp] Template: ${message.templateName}`);
        console.log(`[WhatsApp] Params: ${message.templateParams?.join(', ')}`);
        return {
            success: true,
            messageId: 'demo-wa-' + Date.now(),
            error: 'WhatsApp not configured - message logged to console',
        };
    }

    try {
        const phoneNumber = formatPhoneNumber(message.to);

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'template',
                    template: {
                        name: message.templateName || 'ticket_confirmation',
                        language: { code: 'en' },
                        components: message.templateParams ? [
                            {
                                type: 'body',
                                parameters: message.templateParams.map(text => ({
                                    type: 'text',
                                    text,
                                })),
                            },
                        ] : undefined,
                    },
                }),
            }
        );

        const data = await response.json();

        if (data.messages?.[0]?.id) {
            return {
                success: true,
                messageId: data.messages[0].id,
            };
        } else {
            return {
                success: false,
                error: data.error?.message || 'Failed to send WhatsApp message',
            };
        }
    } catch (error: any) {
        console.error('[WhatsApp] Error:', error);
        return {
            success: false,
            error: error.message || 'WhatsApp service error',
        };
    }
}

/**
 * Send WhatsApp text message (only works within 24hr customer-initiated window)
 */
export async function sendWhatsAppText(to: string, message: string): Promise<WhatsAppResult> {
    if (!isWhatsAppConfigured()) {
        console.log('[WhatsApp] Not configured, logging text message:');
        console.log(`[WhatsApp] To: ${to}`);
        console.log(`[WhatsApp] Message: ${message}`);
        return {
            success: true,
            messageId: 'demo-wa-text-' + Date.now(),
            error: 'WhatsApp not configured - message logged to console',
        };
    }

    try {
        const phoneNumber = formatPhoneNumber(to);

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'text',
                    text: { body: message },
                }),
            }
        );

        const data = await response.json();

        if (data.messages?.[0]?.id) {
            return {
                success: true,
                messageId: data.messages[0].id,
            };
        } else {
            return {
                success: false,
                error: data.error?.message || 'Failed to send WhatsApp message',
            };
        }
    } catch (error: any) {
        console.error('[WhatsApp] Error:', error);
        return {
            success: false,
            error: error.message || 'WhatsApp service error',
        };
    }
}

/**
 * Send ticket confirmation via WhatsApp
 */
export async function sendTicketConfirmationWhatsApp(data: {
    phone: string;
    attendeeName: string;
    eventName: string;
    eventDate: string;
    ticketId: string;
    ticketUrl: string;
}): Promise<WhatsAppResult> {
    // Using template if configured, otherwise text
    if (isWhatsAppConfigured()) {
        return sendWhatsAppTemplate({
            to: data.phone,
            templateName: 'ticket_confirmation', // Must be pre-approved template
            templateParams: [
                data.attendeeName,
                data.eventName,
                data.eventDate,
                data.ticketId.slice(-8).toUpperCase(),
            ],
        });
    }

    // Fallback to console log
    const message = `*Ticket Confirmed!*\n\nHi ${data.attendeeName}!\n\nYour ticket for *${data.eventName}* on ${data.eventDate} is ready.\n\nTicket ID: ${data.ticketId.slice(-8).toUpperCase()}\n\nView ticket: ${data.ticketUrl}\n\nShow the QR code at the venue for entry.`;

    return sendWhatsAppText(data.phone, message);
}
