/**
 * Web Push sender. Lazily configures web-push with VAPID keys the first time
 * it's used, then sends notifications. Falls back to a no-op when keys are
 * missing so dev/CI environments don't break.
 */
import webpush from 'web-push';

type SubscriptionLike = {
    endpoint: string;
    p256dh?: string | null;
    auth?: string | null;
};

let configured = false;
let enabled = false;

function ensureConfigured(): boolean {
    if (configured) return enabled;
    configured = true;
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    if (!pub || !priv) {
        enabled = false;
        return false;
    }
    try {
        webpush.setVapidDetails(subject, pub, priv);
        enabled = true;
    } catch (err) {
        console.warn('[web-push] setVapidDetails failed, push disabled', err);
        enabled = false;
    }
    return enabled;
}

export async function sendWebPush(sub: SubscriptionLike, payload: string): Promise<void> {
    if (!ensureConfigured()) {
        // Soft no-op: in dev/CI without VAPID keys we log and resolve.
        return;
    }
    if (!sub.p256dh || !sub.auth) {
        throw new Error('Missing subscription keys');
    }
    await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 }, // 1 hour
    );
}

export function isWebPushConfigured(): boolean {
    return ensureConfigured();
}
