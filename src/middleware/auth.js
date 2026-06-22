import { isValidToken } from '../utils/tokenStore.js';

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && isValidToken(token)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}
