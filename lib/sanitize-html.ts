import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'a', 'b', 'blockquote', 'br', 'code', 'em', 'h1', 'h2', 'h3',
  'h4', 'i', 'li', 'ol', 'p', 'pre', 'strong', 'u', 'ul',
];

/** Sanitize administrator-authored rich text before rendering it as HTML. */
export function sanitizeRichText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
    },
  });
}

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, 'https://eventhub.invalid');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
