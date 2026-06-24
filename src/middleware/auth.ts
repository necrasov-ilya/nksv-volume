import type { Request, RequestHandler } from 'express';
import { isValidToken } from '../utils/tokenStore.js';

export function getSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('nksv_session='));

  if (!sessionCookie) return null;
  return decodeURIComponent(sessionCookie.slice('nksv_session='.length));
}

export const authMiddleware: RequestHandler = (req, res, next) => {
  const token = getSessionToken(req);
  if (token && isValidToken(token)) return next();
  res.status(401).json({ error: 'Требуется вход' });
};
