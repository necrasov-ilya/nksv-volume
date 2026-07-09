import type { ArticleContent, ArticleHeading, Block, RenderedArticle } from '../../types.js';
import { renderBlock } from './renderers.js';

export function renderArticle(
  content: ArticleContent | Block[] | null | undefined,
): RenderedArticle {
  const blocks = Array.isArray(content) ? content : (content?.content ?? []);
  const ctx = { headings: [] as ArticleHeading[] };
  const parts: string[] = ['<article class="article-render">'];
  for (const block of blocks) {
    const rendered = renderBlock(block, ctx);
    if (rendered.html) parts.push(rendered.html);
    if (rendered.heading) ctx.headings.push(rendered.heading);
  }
  parts.push('</article>');
  return { html: parts.join(''), headings: ctx.headings };
}

export function emptyArticleContent(): ArticleContent {
  return {
    content: [{
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }],
  };
}
