interface AttemptState {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function createRateLimiter(config: RateLimitConfig) {
  const attempts = new Map<string, AttemptState>();

  function getState(key: string, now: number): AttemptState {
    const current = attempts.get(key);
    if (!current || now - current.windowStartedAt > config.windowMs) {
      const fresh: AttemptState = { count: 0, windowStartedAt: now, blockedUntil: 0 };
      attempts.set(key, fresh);
      return fresh;
    }
    return current;
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const state = getState(key, now);
      if (state.blockedUntil > now) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000),
        };
      }
      return { allowed: true };
    },
    recordFailure(key: string): RateLimitResult {
      const now = Date.now();
      const state = getState(key, now);
      state.count += 1;
      if (state.count >= config.maxAttempts) state.blockedUntil = now + config.blockMs;
      attempts.set(key, state);
      if (state.blockedUntil > now) {
        return { allowed: false, retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000) };
      }
      return { allowed: true };
    },
    reset(key: string): void {
      attempts.delete(key);
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
