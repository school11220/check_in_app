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

// ---------------------------------------------------------------------------
// Ticket lifecycle + scan payload + allocatePaidAmount idempotency
// ---------------------------------------------------------------------------
import {
  getTicketLifecycleStatus,
  getTicketFinancials,
  isPaidLikeStatus,
  PAID_LIKE_STATUSES,
} from '../lib/ticket-lifecycle';

function testTicketLifecycleStatus() {
  // pending
  assert.equal(getTicketLifecycleStatus({ status: 'pending' }), 'pending');
  // paid not yet checked in
  assert.equal(getTicketLifecycleStatus({ status: 'paid' }), 'paid');
  // paid and checked in -> 'checked_in'
  assert.equal(getTicketLifecycleStatus({ status: 'paid', checkedIn: true }), 'checked_in');
  // partially_refunded + checkedIn -> 'checked_in'
  assert.equal(getTicketLifecycleStatus({ status: 'partially_refunded', checkedIn: true }), 'checked_in');
  // cancelled
  assert.equal(getTicketLifecycleStatus({ status: 'cancelled' }), 'cancelled');
  // refunded
  assert.equal(getTicketLifecycleStatus({ status: 'refunded' }), 'refunded');
  // edge: null status
  assert.equal(isPaidLikeStatus(null), false);
  assert.equal(isPaidLikeStatus('paid'), true);
  assert.equal(isPaidLikeStatus('checked_in'), false);
}

function testTicketFinancials() {
  // No explicit financials: net == event price when paid
  const f1 = getTicketFinancials({ status: 'paid' }, 1000);
  assert.equal(f1.netAmount, 1000);
  assert.equal(f1.amountPaid, 1000);

  // With discount
  const f2 = getTicketFinancials({ status: 'paid', amountPaid: 800, discountAmount: 200 }, 1000);
  assert.equal(f2.netAmount, 800);
  assert.equal(f2.discountAmount, 200);

  // With refund
  const f3 = getTicketFinancials({ status: 'refunded', amountPaid: 0, grossAmount: 1000, refundedAmount: 1000 });
  assert.equal(f3.refundedAmount, 1000);
  assert.equal(f3.grossAmount, 1000);

  // Cancelled: no revenue
  const f4 = getTicketFinancials({ status: 'cancelled' }, 1000);
  assert.equal(f4.netAmount, 0);
  assert.equal(f4.grossAmount, 0);
}

function testTimedQRToken() {
  const ticketId = 'ticket-abc';
  const token = 'plain-secret-token';
  const timed = generateTimedQRToken(ticketId, token);

  // Correct token verifies
  const ok = verifyTimedQRToken(timed, token);
  assert.equal(ok.valid, true);
  assert.equal(ok.ticketId, ticketId);

  // Wrong token rejected
  const wrong = verifyTimedQRToken(timed, 'wrong');
  assert.equal(wrong.valid, false);
  assert.equal(wrong.reason, 'Invalid ticket token');

  // Tampered ticket id inside payload -> HMAC fails
  const parts = timed.split(':');
  parts[0] = 'ticket-other';
  const tampered = parts.join(':');
  const tamper = verifyTimedQRToken(tampered, token);
  assert.equal(tamper.valid, false);
  assert.equal(tamper.reason, 'Tampered QR code');

  // Garbage input
  const garbage = verifyTimedQRToken('not-a-qr', token);
  assert.equal(garbage.valid, false);
}


function testScanPayloadEdgeCases() {
  // Empty/whitespace -> null
  assert.equal(parseScanPayload(''), null);
  assert.equal(parseScanPayload('   '), null);
  // Plain id
  assert.deepEqual(parseScanPayload('T-001'), { ticketId: 'T-001' });
  // URL with query
  const url = 'https://example.com/ticket/abc-123?token=xyz';
  const r = parseScanPayload(url);
  assert.equal(r?.ticketId, 'abc-123');
  assert.equal(r?.token, 'xyz');
  // JSON object
  const j = parseScanPayload(JSON.stringify({ ticketId: 'json-1', token: 'j-tok' }));
  assert.deepEqual(j, { ticketId: 'json-1', token: 'j-tok', timedToken: undefined });
  // token:payload format
  const colon = parseScanPayload('T-007:secret');
  assert.equal(colon?.ticketId, 'T-007');
  assert.equal(colon?.token, 'secret');
}


function testPaidLikeStatuses() {
  assert.deepEqual([...PAID_LIKE_STATUSES], ['paid', 'partially_refunded']);
  assert.equal(isPaidLikeStatus('paid'), true);
  assert.equal(isPaidLikeStatus('partially_refunded'), true);
  assert.equal(isPaidLikeStatus('PENDING'), false);
}

testTicketLifecycleStatus();
testTicketFinancials();
testTimedQRToken();
testScanPayloadEdgeCases();
testPaidLikeStatuses();
