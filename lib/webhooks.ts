import crypto from 'crypto';
import { prisma } from './prisma';

export type WebhookEventType =
  | 'ticket.purchased'
  | 'ticket.checked_in'
  | 'ticket.refunded'
  | 'ticket.transferred'
  | 'event.created'
  | 'event.updated'
  | 'event.cancelled'
  | 'checkin.undo'
  | 'promo.used';

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Sign a webhook payload with HMAC-SHA256
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Fire a webhook event to all registered endpoints for the given event type
 */
export async function fireWebhook(type: WebhookEventType, data: Record<string, any>) {
  try {
    // Load webhook configs from Integration table
    const integrations = await prisma.integration.findMany({
      where: { type: 'webhook', isEnabled: true },
    });

    if (integrations.length === 0) return;

    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadStr = JSON.stringify(payload);

    const results = await Promise.allSettled(
      integrations.map(async (integration: any) => {
        const config = integration.config as any;
        const url = config?.webhookUrl;
        if (!url) return;

        // Filter by subscribed events if specified
        const subscribedEvents = config?.events as string[] | undefined;
        if (subscribedEvents && subscribedEvents.length > 0 && !subscribedEvents.includes(type)) {
          return; // Not subscribed to this event type
        }

        const secret = config?.secret || '';
        const signature = signPayload(payloadStr, secret);

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Id': payload.id,
              'X-Webhook-Timestamp': payload.timestamp,
              'X-Webhook-Event': type,
              'User-Agent': 'EventHub-Webhook/1.0',
            },
            body: payloadStr,
            signal: controller.signal,
          });

          clearTimeout(timeout);

          // Log delivery result
          console.log(`[Webhook] ${type} → ${url} (${response.status})`);

          return {
            integrationId: integration.id,
            status: response.status,
            success: response.ok,
          };
        } catch (err: any) {
          console.error(`[Webhook] Failed ${type} → ${url}:`, err.message);
          return {
            integrationId: integration.id,
            status: 0,
            success: false,
            error: err.message,
          };
        }
      })
    );

    return results;
  } catch (e) {
    console.error('[Webhook] Fire error:', e);
  }
}

/**
 * Verify an incoming webhook signature (for consumers to validate)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}
