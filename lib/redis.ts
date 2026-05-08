import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

interface Limiter {
  limit: (key: string) => Promise<{ success: boolean; reset: number; remaining: number }>;
}

function makeLimiter(
  prefix: string,
  requests: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
): Limiter {
  if (!redis) {
    // No Upstash creds — permissive no-op for local dev. Production must set
    // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN or this gate vanishes.
    return {
      async limit() {
        return { success: true, reset: 0, remaining: requests };
      },
    };
  }
  const rl = new Ratelimit({
    redis,
    prefix: `naman:${prefix}`,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
  return {
    async limit(key: string) {
      const r = await rl.limit(key);
      return { success: r.success, reset: r.reset, remaining: r.remaining };
    },
  };
}

// Per SRS §6.1.2 / §6.1.4 — login lockout & OTP throttling defaults.
export const loginLimiter = makeLimiter('login', 5, '1 m');
export const registerLimiter = makeLimiter('register', 5, '1 h');
export const otpLimiter = makeLimiter('otp', 3, '1 m');
export const passwordResetLimiter = makeLimiter('pw-reset', 3, '1 h');
export const verifyEmailLimiter = makeLimiter('verify-email', 5, '1 h');
