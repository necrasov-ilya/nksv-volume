import type { ArticleHeading, Block } from '../../types.js';
import { escapeHtml, safeImageUrl, slugify, stripTags } from './html.js';
import { renderInline } from './inline.js';
import { renderTable } from './table.js';

export interface RenderResult {
  html: string;
  heading?: ArticleHeading;
}

export interface RenderContext {
  headings: ArticleHeading[];
}

type BlockRenderer = (block: Block, ctx: RenderContext) => RenderResult;

const MARKDOWN_RULE_RE = /^(-{3,}|\*{3,}|_{3,})$/;

function isMarkdownRuleParagraph(block: Block): boolean {
  if (block.type !== 'paragraph' || !block.content?.length) return false;
  const plain = block.content
    .map((node) => (node.type === 'text' ? node.text ?? '' : ''))
    .join('')
    .trim();
  return MARKDOWN_RULE_RE.test(plain);
}

function renderBlockContent(blocks: Block[] | undefined, ctx: RenderContext): string {
  if (!blocks?.length) return '';
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === 'text' || block.type === 'hardBreak') {
      const inline = renderInline([block]);
      if (inline) parts.push(inline);
      continue;
    }
    const rendered = blockRenderers[block.type]
      ? blockRenderers[block.type]!(block, ctx)
      : defaultRenderer(block, ctx);
    if (rendered.html) parts.push(rendered.html);
  }
  return parts.join('');
}

function defaultRenderer(block: Block, _ctx: RenderContext): RenderResult {
  const text = renderInline(block.content);
  return text ? { html: `<p>${text}</p>\n` } : { html: '' };
}

function makeIconBlock(klass: string, icon: string, label: string, body: string): string {
  return `<aside class="${klass}"><span class="mdx-icon"><i class="ti ${icon}" aria-hidden="true"></i></span><div><strong>${label}</strong><div>${body}</div></div></aside>`;
}

const blockRenderers: Record<string, BlockRenderer> = {
  doc: (block, ctx) => {
    const parts: string[] = [];
    for (const child of block.content ?? []) {
      const renderer = blockRenderers[child.type] ?? defaultRenderer;
      const rendered = renderer(child, ctx);
      if (rendered.html) parts.push(rendered.html);
      if (rendered.heading) ctx.headings.push(rendered.heading);
    }
    return { html: parts.join('') };
  },

  heading: (block, _ctx) => {
    let level = Number(block.attrs?.level ?? 2);
    if (!Number.isFinite(level) || level < 1 || level > 6) level = 2;
    const text = renderInline(block.content);
    const cleanText = stripTags(text);
    const id = slugify(cleanText);
    return {
      html: `<h${level} id="${id}">${text}</h${level}>\n`,
      heading: { level, text: cleanText, id },
    };
  },

  paragraph: (block, _ctx) => {
    if (isMarkdownRuleParagraph(block)) return { html: '<hr>\n' };
    const text = renderInline(block.content);
    return { html: text.trim() ? `<p>${text}</p>\n` : '<p></p>\n' };
  },

  keyIdea: (block, ctx) => ({
    html: `<aside class="mdx-key-idea"><span>Ключевая мысль</span><div class="mdx-key-idea__body">${renderBlockContent(block.content, ctx)}</div></aside>`,
  }),

  definition: (block, ctx) => {
    const term = escapeHtml(String(block.attrs?.term ?? ''));
    return {
      html: `<aside class="mdx-block mdx-definition"><span class="mdx-icon"><i class="ti ti-book" aria-hidden="true"></i></span><div><strong>${term}</strong><div class="mdx-block-body">${renderBlockContent(block.content, ctx)}</div></div></aside>`,
    };
  },

  example: (block, ctx) => {
    const title = escapeHtml(String(block.attrs?.title ?? 'Пример') || 'Пример');
    return { html: makeIconBlock('mdx-block mdx-example', 'ti-bulb', title, renderBlockContent(block.content, ctx)) };
  },

  callout: (block, ctx) => {
    const title = escapeHtml(String(block.attrs?.title ?? 'Важно') || 'Важно');
    return { html: makeIconBlock('mdx-block mdx-callout', 'ti-info-circle', title, renderBlockContent(block.content, ctx)) };
  },

  examTrap: (block, ctx) => {
    const body = renderBlockContent(block.content, ctx);
    return { html: makeIconBlock('mdx-block mdx-trap', 'ti-alert-triangle', 'Ловушка формулировки', body) };
  },

  compareTable: (block) => ({ html: renderTable(block.attrs) }),

  horizontalRule: () => ({ html: '<hr>\n' }),

  codeBlock: (block, _ctx) => {
    const text = escapeHtml((block.content ?? [])
      .filter((node) => node.type === 'text')
      .map((node) => node.text ?? '')
      .join(''));
    return { html: `<pre><code>${text}</code></pre>\n` };
  },

  blockquote: (block, ctx) => {
    const content = renderBlockContent(block.content, ctx);
    return { html: content ? `<blockquote>${content}</blockquote>\n` : '' };
  },

  image: (block, _ctx) => {
    const src = escapeHtml(safeImageUrl(String(block.attrs?.src ?? '')));
    const alt = escapeHtml(String(block.attrs?.alt ?? ''));
    return { html: `<img src="${src}" alt="${alt}" />` };
  },

  bulletList: (block, ctx) => {
    const items = (block.content ?? [])
      .filter((item) => item.type === 'listItem')
      .map((item) => `<li>${renderBlockContent(item.content, ctx)}</li>\n`)
      .join('');
    return { html: `<ul>\n${items}</ul>\n` };
  },

  orderedList: (block, ctx) => {
    const items = (block.content ?? [])
      .filter((item) => item.type === 'listItem')
      .map((item) => `<li>${renderBlockContent(item.content, ctx)}</li>\n`)
      .join('');
    return { html: `<ol>\n${items}</ol>\n` };
  },
};

export function renderBlock(block: Block, ctx: RenderContext): RenderResult {
  return (blockRenderers[block.type] ?? defaultRenderer)(block, ctx);
}

export { defaultRenderer };
