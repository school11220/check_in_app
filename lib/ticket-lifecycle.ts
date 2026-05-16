export const PAID_LIKE_STATUSES = ['paid', 'partially_refunded'] as const;
export const ACTIVE_TICKET_STATUSES = [...PAID_LIKE_STATUSES] as const;

export type TicketLifecycleStatus =
  | 'pending'
  | 'paid'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'checked_in';

export function isPaidLikeStatus(status: string | null | undefined) {
  return PAID_LIKE_STATUSES.includes(status as (typeof PAID_LIKE_STATUSES)[number]);
}

export function getTicketLifecycleStatus(ticket: { status: string; checkedIn?: boolean | null }): TicketLifecycleStatus {
  if (isPaidLikeStatus(ticket.status) && ticket.checkedIn) return 'checked_in';
  return ticket.status as TicketLifecycleStatus;
}

export function getTicketFinancials(ticket: {
  status: string;
  amountPaid?: number | null;
  grossAmount?: number | null;
  discountAmount?: number | null;
  refundedAmount?: number | null;
}, eventPrice = 0) {
  const discountAmount = ticket.discountAmount || 0;
  const refundedAmount = ticket.refundedAmount || 0;
  const hasExplicitFinancials = Boolean((ticket.grossAmount || 0) > 0 || discountAmount > 0 || refundedAmount > 0 || (ticket.amountPaid || 0) > 0);
  const netAmount = hasExplicitFinancials
    ? (ticket.amountPaid || 0)
    : (isPaidLikeStatus(ticket.status) ? eventPrice : 0);
  const grossAmount = ticket.grossAmount || Math.max(netAmount + refundedAmount + discountAmount, isPaidLikeStatus(ticket.status) || ticket.status === 'refunded' ? eventPrice : 0);

  return {
    grossAmount,
    discountAmount,
    refundedAmount,
    netAmount,
    amountPaid: netAmount,
  };
}
