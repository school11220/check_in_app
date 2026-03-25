import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type LimitConfig = {
  requests: number;
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`;
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let warnLogged = false;

const ratelimitCache = new Map<string, Ratelimit>();

function getRatelimit(config: LimitConfig) {
  if (!redisUrl || !redisToken) {
    if (!warnLogged) {
      console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing.');
      warnLogged = true;
    }
    return null;
  }

  const key = `${config.requests}:${config.window}`;
  const existing = ratelimitCache.get(key);
  if (existing) return existing;

  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: 'eventhub:rl',
  });

  ratelimitCache.set(key, ratelimit);
  return ratelimit;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

export async function enforceRateLimit(
  request: NextRequest,
  keyPrefix: string,
  config: LimitConfig,
  userId?: string | null
) {
  const ratelimit = getRatelimit(config);
  if (!ratelimit) return null;

  const identifier = userId ? `user:${userId}` : `ip:${getClientIp(request)}`;
  const result = await ratelimit.limit(`${keyPrefix}:${identifier}`);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    );
  }

  return null;
}
