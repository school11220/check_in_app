import QRCode from 'qrcode';
import { generateTicketToken, ticketTokenMatches } from './ticket-security';

export { generateTicketToken };

/**
 * Verify HMAC signature
 */
export function verifyTicketToken(ticketId: string, token: string): boolean {
  try {
    const expectedToken = generateTicketToken(ticketId);
    return ticketTokenMatches(expectedToken, token);
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
