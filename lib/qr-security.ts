import crypto from 'crypto';
import { getTicketSecret } from './ticket-security';

const QR_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minute validity window for time-based tokens

function sign(payload: string) {
  return crypto.createHmac('sha256', getTicketSecret()).update(payload).digest('hex');
}

/**
 * Generate a time-based rotating QR token for enhanced security.
 * The token includes a timestamp + HMAC so it expires and cannot be replayed.
 */
export function generateTimedQRToken(ticketId: string, token: string): string {
  const timestamp = Date.now().toString(36);
  const nonce = crypto.randomBytes(4).toString('hex');
  const payload = `${ticketId}:${token}:${timestamp}:${nonce}`;
  const hmac = sign(payload).slice(0, 16);
  return `${payload}:${hmac}`;
}

/**
 * Verify a timed QR token - checks HMAC + expiration + replay
 */
export function verifyTimedQRToken(
  qrData: string,
  originalToken: string
): { valid: boolean; ticketId: string; reason?: string } {
  try {
    const parts = qrData.split(':');
    if (parts.length < 5) {
      return { valid: false, ticketId: '', reason: 'Invalid QR format' };
    }
    const [ticketId, token, timestamp, nonce, hmac] = parts;
    
    // Verify HMAC
    const payload = `${ticketId}:${token}:${timestamp}:${nonce}`;
    const expectedHmac = sign(payload).slice(0, 16);
    
    if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
      return { valid: false, ticketId, reason: 'Tampered QR code' };
    }

    // Verify token matches
    if (token !== originalToken) {
      return { valid: false, ticketId, reason: 'Invalid ticket token' };
    }

    // Check expiration
    const ts = parseInt(timestamp, 36);
    if (Date.now() - ts > QR_TOKEN_TTL_MS) {
      return { valid: false, ticketId, reason: 'QR code expired - refresh and try again' };
    }

    return { valid: true, ticketId };
  } catch {
    return { valid: false, ticketId: '', reason: 'Invalid QR code' };
  }
}

/**
 * Generate an immutable checksum for audit log entries (tamper-evidence)
 */
export function generateAuditChecksum(
  ticketId: string,
  action: string,
  timestamp: string,
  performedBy: string
): string {
  const data = `${ticketId}|${action}|${timestamp}|${performedBy}`;
  return sign(data);
}

/**
 * Verify an audit log entry's checksum
 */
export function verifyAuditChecksum(
  ticketId: string,
  action: string,
  timestamp: string,
  performedBy: string,
  checksum: string
): boolean {
  const expected = generateAuditChecksum(ticketId, action, timestamp, performedBy);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(checksum, 'hex'));
  } catch {
    return false;
  }
}
