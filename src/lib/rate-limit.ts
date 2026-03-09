import { RATE_LIMITS } from './constants';

// In-memory rate limiting for MVP. Replace with Redis for production.
const limitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Generic rate limiter for any key (userId, IP, etc.) with custom limits.
 * Use this for per-endpoint rate limiting.
 */
export function checkEndpointRateLimit(
  key: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number } {
  const storeKey = `endpoint:${key}:${endpoint}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = limitStore.get(storeKey);
  if (!entry || now > entry.resetAt) {
    limitStore.set(storeKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export function checkRateLimit(
  userId: string,
  action: string,
  tier: 'free' | 'wingman' | 'rizzlord'
): { allowed: boolean; remaining: number } {
  const limits = RATE_LIMITS[tier];
  const key = `${userId}:${action}`;
  const now = Date.now();

  let limit: number;
  let windowMs: number;

  switch (action) {
    case 'matches':
      limit = limits.matches_per_week;
      windowMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case 'theater_turns':
      limit = limits.theater_turns_per_day;
      windowMs = 24 * 60 * 60 * 1000;
      break;
    case 'chat':
      limit = limits.chat_messages_per_day;
      windowMs = 24 * 60 * 60 * 1000;
      break;
    default:
      return { allowed: true, remaining: Infinity };
  }

  if (limit === Infinity) return { allowed: true, remaining: Infinity };

  const entry = limitStore.get(key);
  if (!entry || now > entry.resetAt) {
    limitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}
