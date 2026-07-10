export function normalizeFilename(value: string): string {
  if (!value) return value;
  if (!/(?:Ð|Ñ)[\u0080-\u00BF]/.test(value)) return value;
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') || !/\p{Script=Cyrillic}/u.test(decoded) ? value : decoded;
}
