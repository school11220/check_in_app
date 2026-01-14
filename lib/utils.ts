import crypto from 'crypto';
import QRCode from 'qrcode';

/**
 * Generate HMAC signature for ticket validation
 */
export function generateTicketToken(ticketId: string): string {
  const secret = process.env.TICKET_SECRET_KEY;
  if (!secret) {
    throw new Error('TICKET_SECRET_KEY not configured');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(ticketId);
  return hmac.digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyTicketToken(ticketId: string, token: string): boolean {
  try {
    const expectedToken = generateTicketToken(ticketId);
    const tokenBuffer = Buffer.from(token, 'hex');
    const expectedBuffer = Buffer.from(expectedToken, 'hex');

    if (tokenBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

/**
 * Generate QR code data URL
 */
export async function generateQRCode(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload);
}

/**
 * Format Indian Rupees
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount / 100);
}
