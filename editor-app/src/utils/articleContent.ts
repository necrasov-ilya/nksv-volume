import type { ArticleContent, Block } from '../types.js';

export function normalizeListChildren(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    if (block.type !== 'bulletList' && block.type !== 'orderedList') return block;
    return {
      ...block,
      content: (block.content ?? []).map((item) => ({
        type: 'listItem',
        content: item.content ?? [],
      })),
    };
  });
}

export function toTipTapDocument(content: Block): Record<string, unknown> {
  return {
    type: 'doc',
    content: normalizeListChildren(content.content ?? []),
  };
}

export function fromTipTapDocument(doc: Record<string, unknown>): Block {
  return {
    type: 'doc',
    content: ((doc.content ?? []) as Block[]),
  };
}

export function ensureDocContent(content: { content?: Block[] } | Block | undefined | null): Block {
  const first = content?.content?.[0];
  if (first?.type === 'doc') return first;
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

export function toDoc(content: ArticleContent): Block {
  return ensureDocContent(content);
}

export function toStorage(content: Block): ArticleContent {
  return { content: [content] };
}
