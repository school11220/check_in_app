import crypto from 'crypto';

const DEV_TICKET_SECRET = 'dev-only-ticket-secret';

export function getTicketSecret() {
  const secret = process.env.TICKET_SECRET_KEY;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('TICKET_SECRET_KEY is required in production');
  }
  return secret || DEV_TICKET_SECRET;
}

export function generateTicketToken(ticketId: string) {
  return crypto.createHmac('sha256', getTicketSecret()).update(ticketId).digest('hex');
}

export function generateTransferToken(ticketId: string) {
  const nonce = crypto.randomBytes(24).toString('hex');
  return crypto.createHmac('sha256', getTicketSecret()).update(`${ticketId}:${nonce}`).digest('hex');
}

export function timingSafeStringEqual(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function ticketTokenMatches(storedToken: string | null | undefined, providedToken: string | null | undefined) {
  return timingSafeStringEqual(storedToken, providedToken);
}
