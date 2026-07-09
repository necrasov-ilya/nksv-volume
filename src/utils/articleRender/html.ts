export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function safeLinkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '#';
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (SAFE_LINK_PROTOCOLS.has(parsed.protocol)) return trimmed;
  } catch {
    /* fall through */
  }
  return '#';
}

const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_IMAGE_PREFIXES = ['/uploads/', '/assets/', '/r/'];

export function safeImageUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('assets/')) return `/${trimmed}`;
  if (ALLOWED_IMAGE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (SAFE_IMAGE_PROTOCOLS.has(parsed.protocol)) return trimmed;
  } catch {
    /* fall through */
  }
  return '';
}

export function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/[\s–—]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
  return normalized || 'section';
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}
