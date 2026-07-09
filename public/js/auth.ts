export const SESSION_EXPIRED_EVENT = 'session-expired';

let legacyToken: string | null = null;

export function getLegacyToken(): string | null {
  return legacyToken;
}

export function setLegacyToken(token: string | null): void {
  legacyToken = token;
}

export function authHeader(): Record<string, string> {
  return legacyToken ? { Authorization: `Bearer ${legacyToken}` } : {};
}

export function emitSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
}
