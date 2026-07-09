import express from 'express';
import path from 'path';
import { config } from './config.js';
import { API_PREFIX } from './constants/routes.js';
import { MAX_JSON_BODY_SIZE_BYTES } from './constants/limits.js';
import { errorBoundary } from './middleware/errorBoundary.js';
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import articleRoutes from './routes/articleRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (req.path.startsWith(`${API_PREFIX}/`)) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: MAX_JSON_BODY_SIZE_BYTES }));
app.use((req, res, next) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === req.headers.host) return next();
  } catch {
    // Invalid origins are rejected below.
  }
  return res.status(403).json({ error: 'Недопустимый источник запроса' });
});
app.use(express.static(config.paths.public));

app.use(API_PREFIX, authRoutes);
app.use(API_PREFIX, fileRoutes);
app.use(API_PREFIX, articleRoutes);
app.use('/', publicRoutes);

app.use(errorBoundary);

export default app;
