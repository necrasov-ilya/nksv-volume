import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { config } from '../config.js';

export const errorBoundary: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `Файл превышает лимит ${config.maxFileSizeMb} МБ` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof Error && err.message.startsWith('Unsupported file type')) {
    return res.status(415).json({ error: err.message });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
};
