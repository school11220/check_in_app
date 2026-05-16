import { getSession, hasEventAccess, hasRole, ORGANIZER_ROLES } from '@/lib/auth';
import { generateTicketToken, ticketTokenMatches } from '@/lib/ticket-security';

export async function authorizeTicketAccess(ticket: { id: string; eventId: string; userId?: string | null; token?: string | null }, token?: string | null) {
  const session = await getSession();
  const hasValidToken = ticketTokenMatches(ticket.token, token) || (
    !ticket.token && ticketTokenMatches(generateTicketToken(ticket.id), token)
  );
  const isOwner = Boolean(session?.user.id && ticket.userId && session.user.id === ticket.userId);
  const canManage = Boolean(
    session &&
    hasRole(session.user.role, ORGANIZER_ROLES) &&
    hasEventAccess(session, ticket.eventId)
  );

  return {
    allowed: hasValidToken || isOwner || canManage,
    hasValidToken,
    isOwner,
    canManage,
    session,
  };
}
