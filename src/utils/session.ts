import { config } from '../config.js';
import { sessionTtlSeconds } from './tokenStore.js';

export function buildSessionCookie(token: string, maxAge: number = sessionTtlSeconds): string {
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
