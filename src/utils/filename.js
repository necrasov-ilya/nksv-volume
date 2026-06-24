export function normalizeFilename(value) {
  if (typeof value !== 'string' || !value) return value;

  // Multer exposes UTF-8 filenames through a latin1 string. Decode only that
  // recognizable mojibake form; valid Cyrillic received through JSON must be
  // left untouched.
  if (!/[\u00D0\u00D1][\u0080-\u00BF]/.test(value)) return value;

  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  if (decoded.includes('\uFFFD') || !/[\u0400-\u04FF]/.test(decoded)) return value;
  return decoded;
}
