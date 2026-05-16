export interface ParsedScanPayload {
  ticketId: string;
  token?: string;
  timedToken?: string;
}

function clean(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function tokenFromTimedToken(timedToken: string | undefined): string | undefined {
  if (!timedToken) return undefined;
  const parts = timedToken.split(':');
  return parts.length >= 5 ? clean(parts[1]) : undefined;
}

export function parseScanPayload(raw: string): ParsedScanPayload | null {
  const code = raw.trim();
  if (!code) return null;

  try {
    const data = JSON.parse(code);
    const ticketId = clean(data?.ticketId) || clean(data?.id);
    const timedToken = clean(data?.timedToken);
    const token = clean(data?.token) || tokenFromTimedToken(timedToken);
    if (ticketId) return { ticketId, token, timedToken };
  } catch {
    // Not JSON.
  }

  if (code.startsWith('http://') || code.startsWith('https://')) {
    try {
      const url = new URL(code);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const ticketId = clean(pathParts[pathParts.length - 1]);
      const timedToken = clean(url.searchParams.get('timedToken'));
      const token = clean(url.searchParams.get('token')) || tokenFromTimedToken(timedToken);
      if (ticketId) return { ticketId, token, timedToken };
    } catch {
      // Not a valid URL.
    }
  }

  const parts = code.split(':');
  if (parts.length >= 5 && clean(parts[0])) {
    return { ticketId: parts[0], token: clean(parts[1]), timedToken: code };
  }

  if (parts.length >= 2 && clean(parts[0])) {
    const token = parts.slice(1).join(':');
    return { ticketId: parts[0], token: clean(token) };
  }

  return { ticketId: code };
}
