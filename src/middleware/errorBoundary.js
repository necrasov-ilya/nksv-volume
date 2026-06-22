import multer from 'multer';

export function errorBoundary(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err?.message?.startsWith('Unsupported file type')) {
    return res.status(415).json({ error: err.message });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
