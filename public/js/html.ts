const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string = ''): string {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] ?? char);
}

export function escapeAttr(value: string = ''): string {
  return escapeHtml(value);
}
