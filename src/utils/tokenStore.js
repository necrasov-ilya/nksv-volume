import crypto from 'crypto';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

function digest(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function removeExpiredSessions() {
  const now = Date.now();
  for (const [key, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(key);
  }
}

export function createToken() {
  removeExpiredSessions();
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(digest(token), Date.now() + SESSION_TTL_MS);
  return token;
}

export function isValidToken(token) {
  if (!token) return false;
  const key = digest(token);
  const expiresAt = sessions.get(key);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(key);
    return false;
  }
  return true;
}

export function revokeToken(token) {
  if (!token) return false;
  return sessions.delete(digest(token));
}

export const sessionTtlSeconds = SESSION_TTL_MS / 1000;
