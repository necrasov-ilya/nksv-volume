import type { Block, BlockMark } from '../../types.js';
import { escapeHtml, safeLinkUrl } from './html.js';

type MarkWrapper = (text: string, mark: BlockMark) => string;

const MARK_WRAPPERS: Record<string, MarkWrapper> = {
  bold: (text) => `<strong>${text}</strong>`,
  italic: (text) => `<em>${text}</em>`,
  strike: (text) => `<s>${text}</s>`,
  code: (text) => `<code>${text}</code>`,
  link: (text, mark) => {
    const href = escapeHtml(safeLinkUrl(String(mark.attrs?.href ?? '')));
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  },
};

export function renderInline(nodes: Block[] | undefined): string {
  if (!nodes?.length) return '';
  let html = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      let text = escapeHtml(node.text ?? '');
      for (const mark of node.marks ?? []) {
        const wrap = MARK_WRAPPERS[mark.type];
        if (wrap) text = wrap(text, mark);
      }
      html += text;
    } else if (node.type === 'hardBreak') {
      html += '<br>';
    }
  }
  return html;
}
