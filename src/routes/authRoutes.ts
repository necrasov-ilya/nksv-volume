import { Router, type Request } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';
import { authMiddleware, getSessionToken } from '../middleware/auth.js';
import { createToken, revokeToken, sessionTtlSeconds } from '../utils/tokenStore.js';

interface AttemptState {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

const router = Router();
const attempts = new Map<string, AttemptState>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const passwordSalt = crypto.randomBytes(16);
const expectedPassword = crypto.scryptSync(config.adminPassword, passwordSalt, 64);

function verifyPassword(value: unknown): boolean {
  const candidate = crypto.scryptSync(String(value || ''), passwordSalt, 64);
  return crypto.timingSafeEqual(candidate, expectedPassword);
}

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getAttemptState(key: string): AttemptState {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.windowStartedAt > WINDOW_MS) {
    const fresh: AttemptState = { count: 0, windowStartedAt: now, blockedUntil: 0 };
    attempts.set(key, fresh);
    return fresh;
  }
  return current;
}

function sessionCookie(token: string, maxAge: number = sessionTtlSeconds): string {
  const parts = [
    `nksv_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ];
  if (config.isProduction) parts.push('Secure');
  return parts.join('; ');
}

router.post('/auth', (req, res) => {
  const key = clientKey(req);
  const state = getAttemptState(key);
  const now = Date.now();

  if (state.blockedUntil > now) {
    const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже.' });
  }

  const { password } = req.body;
  if (verifyPassword(password)) {
    attempts.delete(key);
    const token = createToken();
    res.setHeader('Set-Cookie', sessionCookie(token));
    return res.json({ ok: true });
  }

  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) state.blockedUntil = now + BLOCK_MS;
  attempts.set(key, state);
  return res.status(401).json({ error: 'Неверный пароль' });
});

router.get('/auth/session', authMiddleware, (_req, res) => {
  res.json({ ok: true });
});

router.post('/auth/logout', authMiddleware, (req, res) => {
  revokeToken(getSessionToken(req));
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  res.json({ ok: true });
});

export default router;
