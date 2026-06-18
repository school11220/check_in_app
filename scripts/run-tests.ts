import assert from 'node:assert/strict';
import { parseScanPayload } from '../lib/scan-payload';
import {
  generateTicketToken,
  generateTransferToken,
  ticketTokenMatches,
} from '../lib/ticket-security';
import { generateTimedQRToken, verifyTimedQRToken } from '../lib/qr-security';
import { applyPollAction, createPollQuestion } from '../lib/polls';
import { isValidTimeSlot, mergeTimeSlots } from '../lib/time-slots';
import {
  allocatePaidAmount,
  calculateDynamicPrice,
  calculatePromoDiscount,
  calculateTicketUnitPrice,
} from '../lib/pricing';

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

function testPollActions() {
  const created = createPollQuestion({
    eventId: 'event-123',
    question: 'Favorite track?',
    askerName: 'Admin',
    type: 'poll',
    options: ['Talks', 'Workshops'],
    approved: true,
  }, new Date('2026-01-01T00:00:00.000Z'));

  assert.ok(created.question);
  assert.deepEqual(created.question.votes, [0, 0]);

  const voted = applyPollAction(created.question, 'vote', { optionIndex: 1 });
  assert.deepEqual(voted.question?.votes, [0, 1]);
  assert.equal(applyPollAction(created.question, 'vote', { optionIndex: 4 }).error, 'Invalid poll option');

  const qna = createPollQuestion({
    eventId: 'event-123',
    question: 'Will slides be shared?',
    askerName: 'Guest',
    type: 'qna',
  });
  assert.ok(qna.question);

  const answered = applyPollAction(qna.question, 'answer', { text: 'Yes.', authorName: 'Host' });
  assert.equal(answered.question?.answered, true);
  assert.equal(answered.question?.answers?.[0].text, 'Yes.');
}

function testTimeSlots() {
  assert.equal(isValidTimeSlot({ startTime: '09:00', endTime: '10:00' }), true);
  assert.equal(isValidTimeSlot({ startTime: '10:00', endTime: '09:00' }), false);
  assert.deepEqual(
    mergeTimeSlots([
      [{ id: 'a', startTime: '11:00', endTime: '12:00' }],
      [{ id: 'b', startTime: '09:00', endTime: '10:00' }],
      [{ id: 'c', startTime: '09:00', endTime: '10:00' }],
    ]).map(slot => slot.id),
    ['b', 'a'],
  );
}

function testPricing() {
  const event = {
    price: 10000,
    soldCount: 80,
    capacity: 100,
    date: '2026-01-02T00:00:00.000Z',
    startTime: '09:00',
    PricingRule: [
      {
        id: 'demand',
        triggerType: 'DEMAND_BASED',
        triggerValue: 80,
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10,
        active: true,
      },
      {
        id: 'time',
        triggerType: 'TIME_BASED',
        triggerValue: 48,
        adjustmentType: 'FIXED',
        adjustmentValue: 50,
        active: true,
      },
    ],
  };

  assert.equal(calculateDynamicPrice(event, new Date('2026-01-01T00:00:00.000Z')), 16000);
  assert.equal(calculateDynamicPrice(event, new Date('2025-12-01T00:00:00.000Z')), 11000);

  assert.equal(calculateTicketUnitPrice({
    ...event,
    earlyBirdEnabled: true,
    earlyBirdPrice: 7000,
    earlyBirdDeadline: '2026-01-01T12:00:00.000Z',
  }, new Date('2026-01-01T00:00:00.000Z')), 7000);

  assert.equal(calculatePromoDiscount(10000, { discountType: 'percentage', discountValue: 150 }), 10000);
  assert.equal(calculatePromoDiscount(10000, { discountType: 'fixed', discountValue: 25000 }), 10000);
  assert.deepEqual([0, 1, 2].map(index => allocatePaidAmount(100, 3, index)), [34, 33, 33]);
}

testScanPayloadParser();
testTicketSecurity();
testPollActions();
testTimeSlots();
testPricing();
console.log('All tests passed');

// ---------------------------------------------------------------------------
// api-helpers + Zod validation
// ---------------------------------------------------------------------------
import { z } from 'zod';
import { ApiError, badRequest, parseBody } from '../lib/api-helpers';

function testApiError() {
  const e = badRequest('missing field', { field: 'name' });
  assert.equal(e instanceof ApiError, true);
  assert.equal(e.status, 400);
  assert.equal(e.message, 'missing field');
  assert.deepEqual(e.details, { field: 'name' });
}

function testParseBodyRejectsInvalidJson() {
  const req = new Request('http://x', { method: 'POST', body: 'not json' });
  return parseBody(req as any, z.object({ name: z.string() })).then(
    () => { throw new Error('should have thrown'); },
    (err) => {
      assert.equal(err.status, 400);
    },
  );
}

function testParseBodyRejectsBadShape() {
  const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 123 }) });
  return parseBody(req as any, z.object({ name: z.string() })).then(
    () => { throw new Error('should have thrown'); },
    (err) => {
      assert.equal(err.status, 400);
      assert.ok(Array.isArray(err.details));
    },
  );
}

function testParseBodyAcceptsValid() {
  const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Shivam' }) });
  return parseBody(req as any, z.object({ name: z.string() })).then((data) => {
    assert.deepEqual(data, { name: 'Shivam' });
  });
}

testApiError();
testParseBodyRejectsInvalidJson();
testParseBodyRejectsBadShape();
testParseBodyAcceptsValid();
