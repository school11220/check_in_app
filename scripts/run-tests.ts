import assert from 'node:assert/strict';
import { parseScanPayload } from '../lib/scan-payload';
import {
  generateTicketToken,
  generateTransferToken,
  ticketTokenMatches,
} from '../lib/ticket-security';
import { generateTimedQRToken, verifyTimedQRToken } from '../lib/qr-security';

process.env.TICKET_SECRET_KEY = process.env.TICKET_SECRET_KEY || 'test-ticket-secret';

function testScanPayloadParser() {
  assert.deepEqual(parseScanPayload('ticket-123'), { ticketId: 'ticket-123' });
  assert.deepEqual(parseScanPayload('ticket-123:secure-token'), {
    ticketId: 'ticket-123',
    token: 'secure-token',
  });
  assert.deepEqual(parseScanPayload(JSON.stringify({ ticketId: 'ticket-123', token: 'secure-token' })), {
    ticketId: 'ticket-123',
    token: 'secure-token',
    timedToken: undefined,
  });
  assert.deepEqual(parseScanPayload('https://example.com/ticket/ticket-123?token=secure-token'), {
    ticketId: 'ticket-123',
    token: 'secure-token',
    timedToken: undefined,
  });

  const timed = 'ticket-123:plain-token:l0d0:abcd1234:beadfeedbeadfeed';
  assert.deepEqual(parseScanPayload(timed), {
    ticketId: 'ticket-123',
    token: 'plain-token',
    timedToken: timed,
  });
  assert.equal(parseScanPayload('   '), null);
}

function testTicketSecurity() {
  const ticketId = 'ticket-123';
  const token = generateTicketToken(ticketId);
  const alteredToken = `${token[0] === '0' ? '1' : '0'}${token.slice(1)}`;
  assert.equal(ticketTokenMatches(token, token), true);
  assert.equal(ticketTokenMatches(token, alteredToken), false);
  assert.notEqual(generateTransferToken(ticketId), generateTransferToken(ticketId));

  const timedToken = generateTimedQRToken(ticketId, token);
  assert.deepEqual(verifyTimedQRToken(timedToken, token), { valid: true, ticketId });
  assert.equal(verifyTimedQRToken(timedToken, 'wrong-token').valid, false);
}

testScanPayloadParser();
testTicketSecurity();
console.log('All tests passed');
