export type OfflineSyncDecision = 'synced' | 'retry';

export function classifyOfflineSyncResponse(status: number, body: unknown): OfflineSyncDecision {
  if (status >= 200 && status < 300) return 'synced';
  if (status === 400 && body && typeof body === 'object') {
    const message = String((body as { message?: unknown }).message || '').toLowerCase();
    if (message.includes('already checked in')) return 'synced';
  }
  return 'retry';
}
