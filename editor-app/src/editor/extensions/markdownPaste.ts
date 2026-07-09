import { Extension, type Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';

function looksLikeMarkdown(text: string): boolean {
  const sample = text.trim();
  if (!sample || sample.length < 2) return false;

  if ((sample.match(/^#{1,6}\s/mg) || []).length >= 1) return true;
  if ((sample.match(/^\|.+\|$/mg) || []).length >= 2) return true;
  if (/(^|\n)([-*+]\s|\d+[.)]\s|>\s|[—–]\s)/m.test(sample)) return true;
  if (/^```/m.test(sample)) return true;
  if (/(\*\*|__)[^*_]+(\*\*|__)/.test(sample)) return true;
  if (/(?<!\*)\*[^*\n]+\*(?!\*)/.test(sample)) return true;
  if (/(?<![_])_[^_\n]+_(?!_)/.test(sample)) return true;
  if (/\[.+]\(.+\)/.test(sample)) return true;
  if (/!\[.*]\(.+\)/.test(sample)) return true;
  if (/^---+$/m.test(sample)) return true;

  return false;
}

function shouldTryMarkdown(text: string, parser: Editor['markdown'] | undefined): boolean {
  if (looksLikeMarkdown(text)) return true;
  if (!parser || !text.includes('\n') || text.trim().length < 40) return false;

  try {
    const parsed = parser.parse(text);
    const blocks = parsed.content ?? [];
    if (blocks.length > 1) return true;
    if (blocks.some((node) => node.type && node.type !== 'paragraph')) return true;
  } catch { /* ignore */ }

  return false;
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s:|-]+\|$/.test(line.trim());
}

function parsePipeTable(block: string): JSONContent | null {
  const lines = block.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('|'));
  if (lines.length < 2 || !isTableSeparator(lines[1])) return null;

  const columns = parseTableRow(lines[0]);
  const rows = lines.slice(2).map(parseTableRow).filter((row) => row.some((cell) => cell));
  if (!columns.length) return null;

  return {
    type: 'compareTable',
    attrs: { caption: '', columns, rows },
  };
}

function parseMarkdownBlocks(
  markdown: string,
  parser: { parse: (value: string) => JSONContent },
): JSONContent[] {
  const blocks = markdown.trim().split(/\n{2,}/);
  const nodes: JSONContent[] = [];

  for (const block of blocks) {
    const table = parsePipeTable(block);
    if (table) {
      nodes.push(table);
      continue;
    }

    try {
      const parsed = parser.parse(block);
      const chunk = (parsed.content ?? []).filter((node) => node?.type);
      if (chunk.length) {
        nodes.push(...chunk);
        continue;
      }
    } catch { /* fall through */ }

    const trimmed = block.trim();
    if (trimmed) {
      nodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: trimmed }],
      });
    }
  }

  return nodes;
}

function buildMarkdownNodes(raw: string, editor: Editor): JSONContent[] {
  const parser = editor.markdown;
  if (!parser) return [];

  try {
    const full = parser.parse(raw);
    const fullNodes = (full.content ?? []).filter((node) => node?.type);
    if (fullNodes.length) return fullNodes;
  } catch { /* fall through */ }

  return parseMarkdownBlocks(raw, parser);
}

function dispatchNodes(
  view: EditorView,
  from: number,
  to: number,
  nodes: JSONContent[],
): boolean {
  if (!nodes.length) return false;

  try {
    const fragment = Fragment.from(
      nodes.map((node) => view.state.schema.nodeFromJSON(node)),
    );
    view.dispatch(view.state.tr.replaceWith(from, to, fragment));
    return true;
  } catch {
    return false;
  }
}

function insertMarkdown(
  view: EditorView,
  editor: Editor,
  from: number,
  to: number,
  raw: string,
): boolean {
  if (dispatchNodes(view, from, to, buildMarkdownNodes(raw, editor))) return true;

  if (editor.commands.insertContentAt({ from, to }, raw, { contentType: 'markdown' })) {
    return true;
  }

  return dispatchNodes(
    view,
    from,
    to,
    raw.split(/\n{2,}/).map((block) => ({
      type: 'paragraph',
      content: block.trim() ? [{ type: 'text', text: block.trim() }] : [],
    })),
  );
}

const STRUCTURAL_BLOCKS = new Set([
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'compareTable',
  'keyIdea',
  'definition',
  'example',
  'callout',
  'examTrap',
]);

function blockToPlainText(block: JSONContent): string {
  if (block.type === 'text') return block.text ?? '';
  return (block.content ?? []).map(blockToPlainText).join('');
}

export function docToPlainText(doc: JSONContent): string {
  const blocks = doc.content ?? [];
  const lines = blocks.map((block) => blockToPlainText(block)).filter(Boolean);
  if (!lines.length) return '';

  const allParagraphs = blocks.every((block) => !block.type || block.type === 'paragraph');
  if (allParagraphs && lines.length > 1) {
    return lines.join('\n');
  }

  return lines.join('\n\n');
}

export function docLooksLikeUnparsedMarkdown(doc: JSONContent): boolean {
  const blocks = doc.content ?? [];
  if (!blocks.length) return false;
  if (blocks.some((block) => block.type && STRUCTURAL_BLOCKS.has(block.type))) return false;

  return looksLikeMarkdown(docToPlainText(doc));
}

export function normalizeRawMarkdownDoc(doc: JSONContent, editor: Editor): JSONContent | null {
  if (!docLooksLikeUnparsedMarkdown(doc)) return null;
  const nodes = buildMarkdownNodes(docToPlainText(doc), editor);
  return nodes.length ? { type: 'doc', content: nodes } : null;
}

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',
  priority: 1000,
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste: (view, event) => {
            const text = (event.clipboardData?.getData('text/plain') ?? '').replace(/\r\n/g, '\n');
            if (!text.trim() || !editor.markdown || !shouldTryMarkdown(text, editor.markdown)) {
              return false;
            }

            const { from, to } = view.state.selection;
            if (!insertMarkdown(view, editor, from, to, text)) return false;

            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});