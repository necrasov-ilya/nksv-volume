import { escapeHtml } from './html.js';

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map(escapeHtml)
    : [];
}

export function renderTable(attrs: Record<string, unknown> = {}): string {
  const caption = typeof attrs.caption === 'string' ? escapeHtml(attrs.caption) : '';
  const columns = asStringArray(attrs.columns);
  const rows = Array.isArray(attrs.rows)
    ? attrs.rows
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) => row.map((cell) => (typeof cell === 'string' ? escapeHtml(cell) : '')))
    : [];

  const captionHtml = caption ? `<figcaption>${caption}</figcaption>` : '';
  const headHtml = `<thead><tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`;
  const bodyHtml = `<tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;

  return `<figure class="mdx-table-wrap">${captionHtml}<table>${headHtml}${bodyHtml}</table></figure>`;
}
