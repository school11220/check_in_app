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
  const expectedToken = generateTicketToken(ticketId);
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(expectedToken, 'hex')
  );
}

/**
 * Generate QR code data URL
 */
export async function generateQRCode(ticketId: string, token: string): Promise<string> {
  const payload = JSON.stringify({ ticketId, token });
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
