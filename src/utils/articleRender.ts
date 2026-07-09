import type { ArticleContent, ArticleHeading, Block, RenderedArticle } from '../types.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeLinkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '#';
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return trimmed;
  } catch { /* fall through */ }
  return '#';
}

function safeImageUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('assets/')) return `/${trimmed}`;
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/assets/') || trimmed.startsWith('/r/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (['http:', 'https:'].includes(parsed.protocol)) return trimmed;
  } catch { /* fall through */ }
  return '';
}

function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/[\s–—]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
  return normalized || 'section';
}

function renderInline(nodes: Block[] | undefined): string {
  if (!nodes?.length) return '';
  let html = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      let text = escapeHtml(node.text ?? '');
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case 'bold': text = `<strong>${text}</strong>`; break;
          case 'italic': text = `<em>${text}</em>`; break;
          case 'strike': text = `<s>${text}</s>`; break;
          case 'code': text = `<code>${text}</code>`; break;
          case 'link': {
            const href = escapeHtml(safeLinkUrl(String(mark.attrs?.href ?? '')));
            text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            break;
          }
        }
      }
      html += text;
    } else if (node.type === 'hardBreak') {
      html += '<br>';
    }
  }
  return html;
}

function renderBlockContent(blocks: Block[] | undefined, headings: ArticleHeading[]): string {
  if (!blocks?.length) return '';
  const parts: string[] = [];
  for (const block of blocks) {
    const rendered = renderBlock(block, headings);
    if (rendered.html) parts.push(rendered.html);
  }
  return parts.join('');
}

function renderTable(attrs: Record<string, unknown> = {}): string {
  const caption = typeof attrs.caption === 'string' ? escapeHtml(attrs.caption) : '';
  const columns = Array.isArray(attrs.columns)
    ? attrs.columns.filter((value): value is string => typeof value === 'string').map(escapeHtml)
    : [];
  const rows = Array.isArray(attrs.rows)
    ? attrs.rows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => row.map((cell) => (typeof cell === 'string' ? escapeHtml(cell) : '')))
    : [];

  let html = '<figure class="mdx-table-wrap">';
  if (caption) html += `<figcaption>${caption}</figcaption>`;
  html += '<table><thead><tr>';
  for (const column of columns) html += `<th>${column}</th>`;
  html += '</tr></thead><tbody>';
  for (const row of rows) {
    html += '<tr>';
    for (const cell of row) html += `<td>${cell}</td>`;
    html += '</tr>';
  }
  html += '</tbody></table></figure>';
  return html;
}

function renderBlock(block: Block, headings: ArticleHeading[]): { html: string; heading?: ArticleHeading } {
  switch (block.type) {
    case 'doc': {
      const parts: string[] = [];
      for (const child of block.content ?? []) {
        const rendered = renderBlock(child, headings);
        if (rendered.html) parts.push(rendered.html);
        if (rendered.heading) headings.push(rendered.heading);
      }
      return { html: parts.join('') };
    }
    case 'heading': {
      let level = Number(block.attrs?.level ?? 2);
      if (!Number.isFinite(level) || level < 1 || level > 6) level = 2;
      const text = renderInline(block.content);
      const id = slugify(text.replace(/<[^>]+>/g, ''));
      return {
        html: `<h${level} id="${id}">${text}</h${level}>\n`,
        heading: { level, text: text.replace(/<[^>]+>/g, ''), id },
      };
    }
    case 'paragraph': {
      const text = renderInline(block.content);
      return { html: text.trim() ? `<p>${text}</p>\n` : '<p></p>\n' };
    }
    case 'keyIdea': {
      const content = renderBlockContent(block.content, headings);
      return {
        html: `<aside class="mdx-key-idea"><span>Ключевая мысль</span><div class="mdx-key-idea__body">${content}</div></aside>`,
      };
    }
    case 'definition': {
      const term = escapeHtml(String(block.attrs?.term ?? ''));
      const content = renderBlockContent(block.content, headings);
      return {
        html: `<aside class="mdx-block mdx-definition"><span class="mdx-icon"><i class="ti ti-book" aria-hidden="true"></i></span><div><strong>${term}</strong><div class="mdx-block-body">${content}</div></div></aside>`,
      };
    }
    case 'example': {
      const title = escapeHtml(String(block.attrs?.title ?? 'Пример') || 'Пример');
      const content = renderBlockContent(block.content, headings);
      return {
        html: `<aside class="mdx-block mdx-example"><span class="mdx-icon"><i class="ti ti-bulb" aria-hidden="true"></i></span><div><strong>${title}</strong><div>${content}</div></div></aside>`,
      };
    }
    case 'callout': {
      const title = escapeHtml(String(block.attrs?.title ?? 'Важно') || 'Важно');
      const content = renderBlockContent(block.content, headings);
      return {
        html: `<aside class="mdx-block mdx-callout"><span class="mdx-icon"><i class="ti ti-info-circle" aria-hidden="true"></i></span><div><strong>${title}</strong><div>${content}</div></div></aside>`,
      };
    }
    case 'examTrap': {
      const content = renderBlockContent(block.content, headings);
      return {
        html: `<aside class="mdx-block mdx-trap"><span class="mdx-icon"><i class="ti ti-alert-triangle" aria-hidden="true"></i></span><div><strong>Ловушка формулировки</strong><div>${content}</div></div></aside>`,
      };
    }
    case 'compareTable':
      return { html: renderTable(block.attrs) };
    case 'image': {
      const src = escapeHtml(safeImageUrl(String(block.attrs?.src ?? '')));
      const alt = escapeHtml(String(block.attrs?.alt ?? ''));
      return { html: `<img src="${src}" alt="${alt}" />` };
    }
    case 'bulletList': {
      let html = '<ul>\n';
      for (const item of block.content ?? []) {
        if (item.type !== 'listItem') continue;
        html += `<li>${renderBlockContent(item.content, headings)}</li>\n`;
      }
      html += '</ul>\n';
      return { html };
    }
    case 'orderedList': {
      let html = '<ol>\n';
      for (const item of block.content ?? []) {
        if (item.type !== 'listItem') continue;
        html += `<li>${renderBlockContent(item.content, headings)}</li>\n`;
      }
      html += '</ol>\n';
      return { html };
    }
    default: {
      const text = renderInline(block.content);
      return text ? { html: `<p>${text}</p>\n` } : { html: '' };
    }
  }
}

export function renderArticle(content: ArticleContent | Block[] | null | undefined): RenderedArticle {
  const blocks = Array.isArray(content) ? content : (content?.content ?? []);
  const headings: ArticleHeading[] = [];
  const parts: string[] = ['<article class="article-render">'];
  for (const block of blocks) {
    const rendered = renderBlock(block, headings);
    if (rendered.html) parts.push(rendered.html);
    if (rendered.heading) headings.push(rendered.heading);
  }
  parts.push('</article>');
  return { html: parts.join(''), headings };
}

export function emptyArticleContent(): ArticleContent {
  return {
    content: [{
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }],
  };
}