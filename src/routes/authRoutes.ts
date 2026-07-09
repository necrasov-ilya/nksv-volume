import { Router, type Request } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';
import { AUTH_ROUTE, AUTH_LOGOUT_ROUTE, AUTH_SESSION_ROUTE } from '../constants/routes.js';
import {
  MAX_ATTEMPTS,
  WINDOW_MS,
  BLOCK_MS,
} from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
import { authMiddleware, getSessionToken } from '../middleware/auth.js';
import { createRateLimiter } from '../utils/rateLimit.js';
import { buildSessionCookie } from '../utils/session.js';
import { createToken, revokeToken } from '../utils/tokenStore.js';

const router = Router();

const passwordSalt = crypto.randomBytes(16);
const expectedPassword = crypto.scryptSync(config.adminPassword, passwordSalt, 64);
const limiter = createRateLimiter({
  maxAttempts: MAX_ATTEMPTS,
  windowMs: WINDOW_MS,
  blockMs: BLOCK_MS,
});

function verifyPassword(value: unknown): boolean {
  const candidate = crypto.scryptSync(String(value || ''), passwordSalt, 64);
  return crypto.timingSafeEqual(candidate, expectedPassword);
}

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

router.post(AUTH_ROUTE, (req, res) => {
  const key = clientKey(req);
  const check = limiter.check(key);
  if (!check.allowed) {
    if (check.retryAfterSeconds) res.setHeader('Retry-After', check.retryAfterSeconds);
    return res.status(429).json({ error: ERROR_MESSAGES.tooManyAttempts });
  }

  const { password } = req.body;
  if (verifyPassword(password)) {
    limiter.reset(key);
    const token = createToken();
    res.setHeader('Set-Cookie', buildSessionCookie(token));
    return res.json({ ok: true });
  }

  const result = limiter.recordFailure(key);
  if (!result.allowed && result.retryAfterSeconds) {
    res.setHeader('Retry-After', result.retryAfterSeconds);
    return res.status(429).json({ error: ERROR_MESSAGES.tooManyAttempts });
  }
  return res.status(401).json({ error: ERROR_MESSAGES.invalidPassword });
});

router.get(AUTH_SESSION_ROUTE, authMiddleware, (_req, res) => {
  res.json({ ok: true });
});

router.post(AUTH_LOGOUT_ROUTE, authMiddleware, (req, res) => {
  revokeToken(getSessionToken(req));
  res.setHeader('Set-Cookie', buildSessionCookie('', 0));
  res.json({ ok: true });
});

export default router;
